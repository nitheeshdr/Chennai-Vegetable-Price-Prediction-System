#!/usr/bin/env python3
"""
Train all price prediction models + optionally the vision classifier.
Usage:
  python scripts/train_models.py             # Full training
  python scripts/train_models.py --incremental  # Skip deep learning
  python scripts/train_models.py --vision    # Train vision classifier only
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
from loguru import logger

load_dotenv()


def main():
    parser = argparse.ArgumentParser(description="Train vegetable price models")
    parser.add_argument("--incremental", action="store_true",
                        help="Skip deep learning (faster daily retraining)")
    parser.add_argument("--vision", action="store_true",
                        help="Train vision classifier only")
    parser.add_argument("--no-deep", action="store_true",
                        help="Skip TCN and Transformer models")
    parser.add_argument("--no-lstm", action="store_true",
                        help="Skip LSTM model (faster training on CPU)")
    args = parser.parse_args()

    if args.vision:
        logger.info("Training vision classifier only...")
        from src.vision.train_classifier import train
        train()
        return

    # Price prediction models
    include_deep = not args.incremental and not args.no_deep
    include_lstm = not args.no_lstm
    logger.info(
        f"Starting training pipeline | incremental={args.incremental} | "
        f"deep_learning={include_deep} | lstm={include_lstm}"
    )
    from src.pipeline.training_pipeline import TrainingPipeline
    pipeline = TrainingPipeline(include_deep_learning=include_deep, include_lstm=include_lstm)
    mapping = pipeline.run(incremental=args.incremental)

    logger.info(f"\nTrained models for {len(mapping)} vegetables")
    logger.info("Next step: python scripts/evaluate_models.py")


if __name__ == "__main__":
    main()
