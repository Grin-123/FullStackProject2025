from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import date


class Transaction(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    title: str
    amount: float
    transaction_type: str  # "income" or "expense"
    category: str
    transaction_date: date

    archived: bool = False
