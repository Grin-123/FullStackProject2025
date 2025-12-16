from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import date

class Transaction(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    amount: float
    type: str        # income or expense
    category: str
    date: date
    archived: bool = False
