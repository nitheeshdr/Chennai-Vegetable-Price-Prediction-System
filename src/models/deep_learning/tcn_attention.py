"""
Temporal Convolutional Network (TCN) with Multi-Head Attention for price forecasting.
Uses dilated causal convolutions + self-attention to capture long-range dependencies.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from loguru import logger

from src.models.base_model import BaseModel
from src.models.timeseries.lstm_model import _make_sequences


class _CausalConv1d(nn.Module):
    def __init__(self, in_ch: int, out_ch: int, kernel_size: int, dilation: int):
        super().__init__()
        self.padding = (kernel_size - 1) * dilation
        self.conv = nn.Conv1d(in_ch, out_ch, kernel_size, dilation=dilation, padding=self.padding)

    def forward(self, x):
        return self.conv(x)[:, :, :-self.padding] if self.padding else self.conv(x)


class _TCNBlock(nn.Module):
    def __init__(self, in_ch: int, out_ch: int, kernel_size: int, dilation: int, dropout: float):
        super().__init__()
        self.net = nn.Sequential(
            _CausalConv1d(in_ch, out_ch, kernel_size, dilation),
            nn.BatchNorm1d(out_ch),
            nn.GELU(),
            nn.Dropout(dropout),
            _CausalConv1d(out_ch, out_ch, kernel_size, dilation),
            nn.BatchNorm1d(out_ch),
            nn.GELU(),
            nn.Dropout(dropout),
        )
        self.residual = nn.Conv1d(in_ch, out_ch, 1) if in_ch != out_ch else nn.Identity()
        self.act = nn.GELU()

    def forward(self, x):
        return self.act(self.net(x) + self.residual(x))


class _TCNAttentionNet(nn.Module):
    def __init__(
        self, input_size: int, channels: list[int], kernel_size: int,
        num_heads: int, dropout: float
    ):
        super().__init__()
        layers = []
        in_ch = input_size
        for i, out_ch in enumerate(channels):
            layers.append(_TCNBlock(in_ch, out_ch, kernel_size, dilation=2**i, dropout=dropout))
            in_ch = out_ch
        self.tcn = nn.Sequential(*layers)
        self.attn = nn.MultiheadAttention(in_ch, num_heads, dropout=dropout, batch_first=True)
        self.norm = nn.LayerNorm(in_ch)
        self.fc = nn.Linear(in_ch, 1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (B, T, F) → TCN expects (B, F, T)
        out = self.tcn(x.permute(0, 2, 1)).permute(0, 2, 1)  # (B, T, C)
        attn_out, _ = self.attn(out, out, out)
        out = self.norm(out + attn_out)
        return self.fc(out[:, -1, :]).squeeze(-1)


class TCNAttentionModel(BaseModel):
    name = "tcn_attention"

    def __init__(self, params: dict | None = None):
        super().__init__(params)
        self.seq_len = self.params.get("sequence_length", 14)
        self.channels = self.params.get("num_channels", [64, 128, 128, 64])
        self.kernel_size = self.params.get("kernel_size", 3)
        self.num_heads = self.params.get("num_heads", 4)
        self.dropout = self.params.get("dropout", 0.2)
        self.lr = self.params.get("learning_rate", 0.001)
        self.epochs = self.params.get("epochs", 100)
        self.patience = self.params.get("patience", 15)
        self.batch_size = self.params.get("batch_size", 64)
        self._feature_cols: list[str] = []
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    def _train_loop(self, train, val, target_col):
        from torch.utils.data import DataLoader, TensorDataset

        X_tr, y_tr = _make_sequences(train, self._feature_cols, target_col, self.seq_len)
        if len(X_tr) == 0:
            return

        train_ds = TensorDataset(
            torch.tensor(X_tr, dtype=torch.float32),
            torch.tensor(y_tr, dtype=torch.float32),
        )
        loader = DataLoader(train_ds, batch_size=self.batch_size, shuffle=True)

        val_loader = None
        if val is not None and len(val) > self.seq_len:
            X_v, y_v = _make_sequences(val, self._feature_cols, target_col, self.seq_len)
            val_loader = DataLoader(
                TensorDataset(
                    torch.tensor(X_v, dtype=torch.float32),
                    torch.tensor(y_v, dtype=torch.float32),
                ),
                batch_size=self.batch_size,
            )

        optimizer = torch.optim.AdamW(self._model.parameters(), lr=self.lr, weight_decay=1e-4)
        criterion = nn.HuberLoss()
        scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=self.epochs)

        best_val, patience_counter, best_state = float("inf"), 0, None

        for epoch in range(self.epochs):
            self._model.train()
            for X_b, y_b in loader:
                X_b, y_b = X_b.to(self.device), y_b.to(self.device)
                optimizer.zero_grad()
                criterion(self._model(X_b), y_b).backward()
                nn.utils.clip_grad_norm_(self._model.parameters(), 1.0)
                optimizer.step()
            scheduler.step()

            if val_loader:
                self._model.eval()
                val_l = np.mean([
                    criterion(self._model(X_b.to(self.device)), y_b.to(self.device)).item()
                    for X_b, y_b in val_loader
                ])
                if val_l < best_val:
                    best_val = val_l
                    best_state = {k: v.cpu().clone() for k, v in self._model.state_dict().items()}
                    patience_counter = 0
                else:
                    patience_counter += 1
                    if patience_counter >= self.patience:
                        logger.info(f"TCN early stop at epoch {epoch}")
                        break

        if best_state:
            self._model.load_state_dict(best_state)

    def fit(self, train, val=None, feature_cols=None, target_col="target_price"):
        feat_df = self._get_features(train, feature_cols)
        self._feature_cols = list(feat_df.columns)
        self._model = _TCNAttentionNet(
            len(self._feature_cols), self.channels, self.kernel_size,
            self.num_heads, self.dropout
        ).to(self.device)
        self._train_loop(train, val, target_col)
        self._is_fitted = True

    def predict(self, X, feature_cols=None):
        self._model.eval()
        X_seq, _ = _make_sequences(
            X.assign(target_price=0), self._feature_cols, "target_price", self.seq_len
        )
        if len(X_seq) == 0:
            return np.array([])
        with torch.no_grad():
            preds = self._model(
                torch.tensor(X_seq, dtype=torch.float32).to(self.device)
            ).cpu().numpy()
        return np.clip(preds, 0, None)

    def predict_with_interval(self, X, feature_cols=None, interval_width=0.9):
        preds = self.predict(X, feature_cols)
        margin = preds * 0.10
        return preds, np.clip(preds - margin, 0, None), preds + margin

    def save(self, path: Path) -> None:
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        torch.save({
            "state_dict": self._model.state_dict(),
            "feature_cols": self._feature_cols,
            "params": self.params,
        }, path)

    def load(self, path: Path) -> None:
        checkpoint = torch.load(path, map_location=self.device)
        self._feature_cols = checkpoint["feature_cols"]
        self.params.update(checkpoint.get("params", {}))
        self._model = _TCNAttentionNet(
            len(self._feature_cols), self.channels, self.kernel_size,
            self.num_heads, self.dropout
        ).to(self.device)
        self._model.load_state_dict(checkpoint["state_dict"])
        self._model.eval()
        self._is_fitted = True
