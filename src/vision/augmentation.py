"""
Albumentations augmentation pipeline for vegetable image training.
"""
from __future__ import annotations

import albumentations as A
from albumentations.pytorch import ToTensorV2

IMG_SIZE = 224


def get_train_transforms() -> A.Compose:
    return A.Compose([
        A.RandomResizedCrop(IMG_SIZE, IMG_SIZE, scale=(0.7, 1.0)),
        A.HorizontalFlip(p=0.5),
        A.VerticalFlip(p=0.2),
        A.RandomRotate90(p=0.3),
        A.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.3, hue=0.1, p=0.8),
        A.OneOf([
            A.GaussianBlur(blur_limit=3),
            A.MotionBlur(blur_limit=3),
            A.MedianBlur(blur_limit=3),
        ], p=0.2),
        A.RandomShadow(p=0.2),
        A.GaussNoise(var_limit=(10, 50), p=0.2),
        A.Normalize(mean=(0.485, 0.456, 0.406), std=(0.229, 0.224, 0.225)),
        ToTensorV2(),
    ])


def get_val_transforms() -> A.Compose:
    return A.Compose([
        A.Resize(IMG_SIZE, IMG_SIZE),
        A.Normalize(mean=(0.485, 0.456, 0.406), std=(0.229, 0.224, 0.225)),
        ToTensorV2(),
    ])


def get_inference_transforms() -> A.Compose:
    return get_val_transforms()
