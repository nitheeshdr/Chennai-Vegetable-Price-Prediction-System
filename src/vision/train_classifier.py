"""
Fine-tune EfficientNet-B4 on vegetable image dataset.
Downloads dataset from Kaggle automatically if not present.
"""
from __future__ import annotations

import os
import shutil
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from loguru import logger
from torch.utils.data import DataLoader, Dataset
from PIL import Image

from src.vision.augmentation import get_train_transforms, get_val_transforms
from src.vision.classifier import VegetableClassifier, build_efficientnet, _load_class_names

# Kaggle dataset: kritikseth/fruit-and-vegetable-image-recognition
# OR: msambare/vegetable-image-dataset
KAGGLE_DATASETS = [
    "msambare/vegetable-image-dataset",
    "kritikseth/fruit-and-vegetable-image-recognition",
]
DATA_DIR = Path("data/raw/vision_dataset")
ARTIFACT_DIR = Path("data/model_artifacts")


class VegetableImageDataset(Dataset):
    def __init__(self, root: Path, class_names: list[str], transforms=None):
        self.transforms = transforms
        self.samples: list[tuple[Path, int]] = []
        cls_map = {name.lower(): i for i, name in enumerate(class_names)}
        for cls_dir in sorted(root.iterdir()):
            if not cls_dir.is_dir():
                continue
            cls_key = cls_dir.name.lower().replace(" ", "_").replace("-", "_")
            cls_idx = cls_map.get(cls_key, cls_map.get(cls_dir.name.lower()))
            if cls_idx is None:
                continue
            for img_path in cls_dir.glob("*.[jp][pn][g]*"):
                self.samples.append((img_path, cls_idx))
        logger.info(f"Dataset: {len(self.samples)} images in {root}")

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, label = self.samples[idx]
        img = np.array(Image.open(path).convert("RGB"))
        if self.transforms:
            img = self.transforms(image=img)["image"]
        return img, label


def download_vision_dataset() -> bool:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if list(DATA_DIR.rglob("*.jpg")) or list(DATA_DIR.rglob("*.png")):
        logger.info(f"Vision dataset already exists: {DATA_DIR}")
        return True
    for slug in KAGGLE_DATASETS:
        try:
            import os
            ret = os.system(
                f"kaggle datasets download -d {slug} -p {DATA_DIR} --unzip --quiet"
            )
            if ret == 0 and (list(DATA_DIR.rglob("*.jpg")) or list(DATA_DIR.rglob("*.png"))):
                logger.info(f"Downloaded vision dataset: {slug}")
                return True
        except Exception as exc:
            logger.warning(f"Failed to download {slug}: {exc}")
    return False


def train(
    epochs: int = 30,
    batch_size: int = 32,
    lr: float = 1e-4,
    patience: int = 7,
) -> None:
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    class_names = _load_class_names()
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"Training on {device}, {len(class_names)} classes")

    if not download_vision_dataset():
        logger.error("Could not obtain vision dataset. Set KAGGLE_USERNAME + KAGGLE_KEY.")
        return

    # Auto-detect train/val split directories
    train_dir = DATA_DIR / "train"
    val_dir = DATA_DIR / "validation"
    if not train_dir.exists():
        train_dir = DATA_DIR  # flat structure, we'll split manually
        val_dir = None

    train_ds = VegetableImageDataset(train_dir, class_names, get_train_transforms())
    if val_dir and val_dir.exists():
        val_ds = VegetableImageDataset(val_dir, class_names, get_val_transforms())
    else:
        # 80/20 split
        n_val = int(0.2 * len(train_ds))
        train_ds, val_ds = torch.utils.data.random_split(
            train_ds, [len(train_ds) - n_val, n_val]
        )

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True,
                              num_workers=4, pin_memory=True)
    val_loader = DataLoader(val_ds, batch_size=batch_size, num_workers=4, pin_memory=True)

    model = build_efficientnet(len(class_names), pretrained=True).to(device)

    # Freeze backbone initially, train head only
    for param in model.features.parameters():
        param.requires_grad = False
    optimizer = torch.optim.AdamW(model.classifier.parameters(), lr=lr * 5)
    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)

    best_acc, patience_counter, best_state = 0.0, 0, None

    for epoch in range(epochs):
        # Unfreeze all after 5 epochs
        if epoch == 5:
            for param in model.parameters():
                param.requires_grad = True
            optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
            scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs - 5)

        model.train()
        train_loss, train_correct = 0.0, 0
        for imgs, labels in train_loader:
            imgs, labels = imgs.to(device), labels.to(device)
            optimizer.zero_grad()
            out = model(imgs)
            loss = criterion(out, labels)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            train_loss += loss.item() * len(imgs)
            train_correct += (out.argmax(1) == labels).sum().item()

        if epoch >= 5:
            scheduler.step()

        # Validation
        model.eval()
        val_correct = 0
        with torch.no_grad():
            for imgs, labels in val_loader:
                out = model(imgs.to(device))
                val_correct += (out.argmax(1) == labels.to(device)).sum().item()

        val_acc = val_correct / len(val_ds)
        logger.info(
            f"Epoch {epoch+1}/{epochs} | "
            f"Train Loss: {train_loss/len(train_ds):.4f} | "
            f"Val Acc: {val_acc:.4f}"
        )

        if val_acc > best_acc:
            best_acc = val_acc
            best_state = {k: v.cpu().clone() for k, v in model.state_dict().items()}
            patience_counter = 0
        else:
            patience_counter += 1
            if patience_counter >= patience:
                logger.info(f"Early stop at epoch {epoch+1}")
                break

    if best_state:
        model.load_state_dict(best_state)

    # Export as TorchScript
    model.eval().to("cpu")
    scripted = torch.jit.script(model)
    out_path = ARTIFACT_DIR / "vegetable_classifier.pt"
    torch.jit.save(scripted, str(out_path))
    logger.info(f"Saved TorchScript model → {out_path} (Val Acc: {best_acc:.4f})")

    # Save class names alongside
    import json
    (ARTIFACT_DIR / "class_names.json").write_text(json.dumps(class_names))


if __name__ == "__main__":
    train()
