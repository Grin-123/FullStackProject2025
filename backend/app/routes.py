from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from .database import get_session
from .models import Transaction
from .auth import get_current_user

router = APIRouter()

@router.post("/transactions")
def create_transaction(transaction: Transaction, session: Session = Depends(get_session)):
    session.add(transaction)
    session.commit()
    session.refresh(transaction)
    return transaction

@router.get("/transactions")
def get_transactions(session: Session = Depends(get_session)):
    return session.exec(
        select(Transaction).where(Transaction.archived == False)
    ).all()

@router.put("/transactions/{id}")
def update_transaction(
    id: int,
    updated: Transaction,
    session: Session = Depends(get_session),
    user=Depends(get_current_user)
):
    transaction = session.get(Transaction, id)
    if not transaction:
        raise HTTPException(status_code=404, detail="Not found")

    transaction.title = updated.title
    transaction.amount = updated.amount
    transaction.type = updated.type
    transaction.category = updated.category
    transaction.date = updated.date
    session.commit()
    return transaction

@router.patch("/transactions/{id}/archive")
def archive_transaction(
    id: int,
    session: Session = Depends(get_session),
    user=Depends(get_current_user)
):
    transaction = session.get(Transaction, id)
    transaction.archived = True
    session.commit()
    return {"message": "Archived"}

@router.delete("/transactions/{id}")
def delete_transaction(
    id: int,
    session: Session = Depends(get_session),
    user=Depends(get_current_user)
):
    transaction = session.get(Transaction, id)
    session.delete(transaction)
    session.commit()
    return {"message": "Deleted"}
