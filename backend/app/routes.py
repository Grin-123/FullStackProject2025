from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from datetime import date
from .database import get_session
from .models import Transaction
from .auth import get_current_user

router = APIRouter()


@router.post("/transactions", response_model=Transaction)
def create_transaction(transaction: Transaction, session: Session = Depends(get_session)):
    # basic validation
    if transaction.amount < 0:
        raise HTTPException(status_code=400, detail="Amount must be >= 0")
    if transaction.transaction_type not in ("income", "expense"):
        raise HTTPException(status_code=400, detail="transaction_type must be income or expense")

    session.add(transaction)
    session.commit()
    session.refresh(transaction)
    return transaction


@router.get("/transactions", response_model=list[Transaction])
def read_transactions(
    include_archived: bool = False,
    session: Session = Depends(get_session),
):
    q = select(Transaction)
    if not include_archived:
        q = q.where(Transaction.archived == False)  # noqa: E712
    return session.exec(q).all()


@router.get("/transactions/{transaction_id}", response_model=Transaction)
def read_transaction(transaction_id: int, session: Session = Depends(get_session)):
    tx = session.get(Transaction, transaction_id)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return tx


@router.put("/transactions/{transaction_id}", response_model=Transaction)
def update_transaction(
    transaction_id: int,
    updated: Transaction,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    tx = session.get(Transaction, transaction_id)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    if updated.amount < 0:
        raise HTTPException(status_code=400, detail="Amount must be >= 0")
    if updated.transaction_type not in ("income", "expense"):
        raise HTTPException(status_code=400, detail="transaction_type must be income or expense")

    tx.title = updated.title
    tx.amount = updated.amount
    tx.transaction_type = updated.transaction_type
    tx.category = updated.category
    tx.transaction_date = updated.transaction_date
    session.commit()
    session.refresh(tx)
    return tx


@router.patch("/transactions/{transaction_id}/archive")
def archive_transaction(
    transaction_id: int,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    tx = session.get(Transaction, transaction_id)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    tx.archived = True
    session.commit()
    return {"message": "Transaction archived"}


@router.delete("/transactions/{transaction_id}")
def delete_transaction(
    transaction_id: int,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    tx = session.get(Transaction, transaction_id)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    session.delete(tx)
    session.commit()
    return {"message": "Transaction deleted"}
