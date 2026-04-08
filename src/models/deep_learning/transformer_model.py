"""
Transformer-based time series model for vegetable price forecasting.
Encoder-only architecture with positional encoding.
"""
from __future__ import annotations

import math
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from loguru import logger

from src.models.base_model import BaseModel
from src.models.timeseries.lstm_model import _make_sequences


class _PositionalEncoding(nn.Module):
    def __init__(self, d_model: int, max_len: int = 512, dropout: float = 0.1):
        super().__init__()
        self.dropout = nn.Dropout(dropout)
        pe = torch.zeros(max_len, d_model)
        pos = torch.arange(max_len).unsqueeze(1).float()
        div = torch.exp(torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model))
        pe[:, 0::2] = torch.sin(pos * div)
        pe[:, 1::2] = torch.cos(pos * div)
        self.register_buffer("pe", pe.unsqueeze(0))  # (1, max_len, d_model)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.dropout(x + self.pe[:, :x.size(1)])


class _PriceTransformer(nn.Module):
    def __init__(
        self, input_size: int, d_model: int, nhead: int,
        num_layers: int, dim_ff: int, dropout: float
    ):
        super().__init__()
        self.input_proj = nn.Linear(input_size, d_model)
        self.pos_enc = _PositionalEncoding(d_model, dropout=dropout)
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model, nhead=nhead, dim_feedforward=dim_ff,
            dropout=dropout, batch_first=True, activation="gelu"
        )
        self.encoder = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
        self.norm = nn.LayerNorm(d_model)
        self.head = nn.Sequential(
            nn.Linear(d_model, d_model // 2),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(d_model // 2, 1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.pos_enc(self.input_proj(x))
        x = self.norm(self.encoder(x))
        return self.head(x[:, -1, :]).squeeze(-1)


class TransformerModel(BaseModel):
    name = "transformer"

    def __init__(self, params: dict | None = None):
        super().__init__(params)
        self.seq_len = self.params.get("sequence_length", 14)
        self.d_model = self.params.get("d_model", 128)
        self.nhead = self.params.get("nhead", 4)
        self.num_layers = self.params.get("num_encoder_layers", 3)
        self.dim_ff = self.params.get("dim_feedforward", 256)
        self.dropout = self.params.get("dropout", 0.1)
        self.lr = self.params.get("learning_rate", 0.0005)
        self.epochs = self.params.get("epochs", 100)
        self.patience = self.params.get("patience", 15)
        self.batch_size = self.params.get("batch_size", 64)
        self._feature_cols: list[str] = []
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    def fit(self, train, val=None, feature_cols=None, target_col="target_price"):
        from torch.utils.data import DataLoader, TensorDataset

        feat_df = self._get_features(train, feature_cols)
        self._feature_cols = list(feat_df.columns)

        self._model = _PriceTransformer(
            len(self._feature_cols), self.d_model, self.nhead,
            self.num_layers, self.dim_ff, self.dropout
        ).to(self.device)

        X_tr, y_tr = _make_sequences(train, self._feature_cols, target_col, self.seq_len)
        loader = DataLoader(
            TensorDataset(
                torch.tensor(X_tr, dtype=torch.float32),
                torch.tensor(y_tr, dtype=torch.float32),
            ),
            batch_size=self.batch_size, shuffle=True,
        )

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

        optimizer = torch.optim.AdamW(
            self._model.parameters(), lr=self.lr, weight_decay=1e-4
        )
        criterion = nn.HuberLoss()
        scheduler = torch.optim.lr_scheduler.OneCycleLR(
            optimizer, max_lr=self.lr * 10,
            steps_per_epoch=len(loader), epochs=self.epochs,
        )

        best_val, patience_counter, best_state = float("inf"), 0, None

        for epoch in range(self.epochs):
            self._model.train()
            for X_b, y_b in loader:
                X_b, y_b = X_b.to(self.device), y_b.to(self.device)
                optimizer.zero_grad()
                criterion(self._model(X_b), y_b).backward()
                nn.utils.clip_grad_norm_(self._model.parameters(), 0.5)
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
                        logger.info(f"Transformer early stop at epoch {epoch}")
                        break

        if best_state:
            self._model.load_state_dict(best_state)
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
        self._model = _PriceTransformer(
            len(self._feature_cols), self.d_model, self.nhead,
            self.num_layers, self.dim_ff, self.dropout
        ).to(self.device)
        self._model.load_state_dict(checkpoint["state_dict"])
        self._model.eval()
        self._is_fitted = True
