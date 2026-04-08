"""
PyTorch LSTM/GRU model for vegetable price forecasting.
Sequence-to-one: takes last `seq_len` days of features, predicts next-day price.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from loguru import logger
from pathlib import Path

from src.models.base_model import BaseModel


class _LSTMNet(nn.Module):
    def __init__(self, input_size: int, hidden_size: int, num_layers: int, dropout: float):
        super().__init__()
        self.lstm = nn.LSTM(
            input_size, hidden_size, num_layers,
            batch_first=True, dropout=dropout if num_layers > 1 else 0.0,
        )
        self.dropout = nn.Dropout(dropout)
        self.fc = nn.Linear(hidden_size, 1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        out, _ = self.lstm(x)
        out = self.dropout(out[:, -1, :])
        return self.fc(out).squeeze(-1)


def _make_sequences(
    df: pd.DataFrame, feature_cols: list[str], target_col: str, seq_len: int
) -> tuple[np.ndarray, np.ndarray]:
    X_all, y_all = [], []
    df = df.sort_values("date").reset_index(drop=True)
    feats = df[feature_cols].fillna(0).values.astype(np.float32)
    targets = df[target_col].values.astype(np.float32)
    for i in range(seq_len, len(df)):
        X_all.append(feats[i - seq_len:i])
        y_all.append(targets[i])
    return np.array(X_all), np.array(y_all)


class LSTMModel(BaseModel):
    name = "lstm"

    def __init__(self, params: dict | None = None):
        super().__init__(params)
        self.seq_len = self.params.get("sequence_length", 14)
        self.hidden_size = self.params.get("hidden_size", 128)
        self.num_layers = self.params.get("num_layers", 2)
        self.dropout = self.params.get("dropout", 0.2)
        self.lr = self.params.get("learning_rate", 0.001)
        self.epochs = self.params.get("epochs", 100)
        self.patience = self.params.get("patience", 15)
        self.batch_size = self.params.get("batch_size", 64)
        self._feature_cols: list[str] = []
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    def fit(self, train, val=None, feature_cols=None, target_col="target_price"):
        from torch.utils.data import DataLoader, TensorDataset

        feat_df = self._get_features(train, feature_cols)
        self._feature_cols = list(feat_df.columns)
        input_size = len(self._feature_cols)

        self._model = _LSTMNet(input_size, self.hidden_size, self.num_layers, self.dropout)
        self._model.to(self.device)

        X_tr, y_tr = _make_sequences(train, self._feature_cols, target_col, self.seq_len)
        train_ds = TensorDataset(
            torch.tensor(X_tr, dtype=torch.float32),
            torch.tensor(y_tr, dtype=torch.float32),
        )
        train_loader = DataLoader(train_ds, batch_size=self.batch_size, shuffle=True)

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

        optimizer = torch.optim.Adam(self._model.parameters(), lr=self.lr)
        criterion = nn.HuberLoss()
        scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, patience=5)

        best_val_loss = float("inf")
        patience_counter = 0
        best_state = None

        for epoch in range(self.epochs):
            self._model.train()
            for X_b, y_b in train_loader:
                X_b, y_b = X_b.to(self.device), y_b.to(self.device)
                optimizer.zero_grad()
                out = self._model(X_b)
                loss = criterion(out, y_b)
                loss.backward()
                nn.utils.clip_grad_norm_(self._model.parameters(), 1.0)
                optimizer.step()

            if val_loader is not None:
                self._model.eval()
                val_losses = []
                with torch.no_grad():
                    for X_b, y_b in val_loader:
                        X_b, y_b = X_b.to(self.device), y_b.to(self.device)
                        val_losses.append(criterion(self._model(X_b), y_b).item())
                val_loss = np.mean(val_losses)
                scheduler.step(val_loss)
                if val_loss < best_val_loss:
                    best_val_loss = val_loss
                    best_state = {k: v.cpu().clone() for k, v in self._model.state_dict().items()}
                    patience_counter = 0
                else:
                    patience_counter += 1
                    if patience_counter >= self.patience:
                        logger.info(f"LSTM early stop at epoch {epoch}")
                        break

        if best_state:
            self._model.load_state_dict(best_state)
        self._is_fitted = True

    def predict(self, X, feature_cols=None):
        self._model.eval()
        cols = feature_cols or self._feature_cols
        X_seq, _ = _make_sequences(
            X.assign(target_price=0), cols, "target_price", self.seq_len
        )
        if len(X_seq) == 0:
            return np.array([])
        with torch.no_grad():
            tensor = torch.tensor(X_seq, dtype=torch.float32).to(self.device)
            preds = self._model(tensor).cpu().numpy()
        return np.clip(preds, 0, None)

    def predict_with_interval(self, X, feature_cols=None, interval_width=0.9):
        # MC Dropout for uncertainty
        self._model.train()  # enable dropout
        cols = feature_cols or self._feature_cols
        X_seq, _ = _make_sequences(
            X.assign(target_price=0), cols, "target_price", self.seq_len
        )
        if len(X_seq) == 0:
            return np.array([]), np.array([]), np.array([])

        tensor = torch.tensor(X_seq, dtype=torch.float32).to(self.device)
        mc_preds = []
        with torch.no_grad():
            for _ in range(20):
                mc_preds.append(self._model(tensor).cpu().numpy())
        mc_preds = np.stack(mc_preds, axis=0)
        self._model.eval()

        preds = mc_preds.mean(axis=0)
        lower_q = (1 - interval_width) / 2 * 100
        upper_q = (1 + interval_width) / 2 * 100
        lower = np.percentile(mc_preds, lower_q, axis=0)
        upper = np.percentile(mc_preds, upper_q, axis=0)
        return (
            np.clip(preds, 0, None),
            np.clip(lower, 0, None),
            np.clip(upper, 0, None),
        )

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
        self._model = _LSTMNet(
            len(self._feature_cols), self.hidden_size, self.num_layers, self.dropout
        )
        self._model.load_state_dict(checkpoint["state_dict"])
        self._model.to(self.device).eval()
        self._is_fitted = True
