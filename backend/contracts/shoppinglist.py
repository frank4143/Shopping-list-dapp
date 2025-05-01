# contracts/shoppinglist.py
import os
from pyteal import *

def approval_program():
    idx = ScratchVar(TealType.uint64)
    last_idx = ScratchVar(TealType.uint64)

    handle_creation = Seq(
        App.globalPut(Bytes("Count"), Int(0)),
        Return(Int(1))
    )

    handle_optin     = Return(Int(0))
    handle_closeout  = Return(Int(0))
    handle_updateapp = Return(Int(0))
    handle_deleteapp = Return(Int(0))

    add_item = Seq(
        idx.store(App.globalGet(Bytes("Count"))),
        App.globalPut(Concat(Bytes("Name_"),     Itob(idx.load())), Txn.application_args[1]),
        App.globalPut(Concat(Bytes("Qty_"),      Itob(idx.load())), Txn.application_args[2]),
        App.globalPut(Concat(Bytes("Category_"), Itob(idx.load())), Txn.application_args[3]),
        App.globalPut(Concat(Bytes("Note_"),     Itob(idx.load())), Txn.application_args[4]),
        App.globalPut(Bytes("Count"), idx.load() + Int(1)),
        Return(Int(1))
    )

    update_item = Seq(
        idx.store(Btoi(Txn.application_args[1])),
        Assert(idx.load() < App.globalGet(Bytes("Count"))),
        App.globalPut(Concat(Bytes("Name_"),     Itob(idx.load())), Txn.application_args[2]),
        App.globalPut(Concat(Bytes("Qty_"),      Itob(idx.load())), Txn.application_args[3]),
        App.globalPut(Concat(Bytes("Category_"), Itob(idx.load())), Txn.application_args[4]),
        App.globalPut(Concat(Bytes("Note_"),     Itob(idx.load())), Txn.application_args[5]),
        Return(Int(1))
    )

    remove_item = Seq(
        idx.store(Btoi(Txn.application_args[1])),
        last_idx.store(App.globalGet(Bytes("Count")) - Int(1)),
        Assert(idx.load() <= last_idx.load()),
        If(
            idx.load() == last_idx.load(),
            # delete last
            Seq(
                App.globalDel(Concat(Bytes("Name_"),     Itob(idx.load()))),
                App.globalDel(Concat(Bytes("Qty_"),      Itob(idx.load()))),
                App.globalDel(Concat(Bytes("Category_"), Itob(idx.load()))),
                App.globalDel(Concat(Bytes("Note_"),     Itob(idx.load())))
            ),
            # swap-last-into-hole + delete last
            Seq(
                App.globalPut(Concat(Bytes("Name_"),     Itob(idx.load())),
                              App.globalGet(Concat(Bytes("Name_"),     Itob(last_idx.load())))),
                App.globalPut(Concat(Bytes("Qty_"),      Itob(idx.load())),
                              App.globalGet(Concat(Bytes("Qty_"),      Itob(last_idx.load())))),
                App.globalPut(Concat(Bytes("Category_"), Itob(idx.load())),
                              App.globalGet(Concat(Bytes("Category_"), Itob(last_idx.load())))),
                App.globalPut(Concat(Bytes("Note_"),     Itob(idx.load())),
                              App.globalGet(Concat(Bytes("Note_"),     Itob(last_idx.load())))),
                App.globalDel(Concat(Bytes("Name_"),     Itob(last_idx.load()))),
                App.globalDel(Concat(Bytes("Qty_"),      Itob(last_idx.load()))),
                App.globalDel(Concat(Bytes("Category_"), Itob(last_idx.load()))),
                App.globalDel(Concat(Bytes("Note_"),     Itob(last_idx.load())))
            )
        ),
        App.globalPut(Bytes("Count"), last_idx.load()),
        Return(Int(1))
    )

    clear_all = Seq(
        idx.store(Int(0)),
        While(idx.load() < App.globalGet(Bytes("Count"))).Do(
            App.globalDel(Concat(Bytes("Name_"),     Itob(idx.load()))),
            App.globalDel(Concat(Bytes("Qty_"),      Itob(idx.load()))),
            App.globalDel(Concat(Bytes("Category_"), Itob(idx.load()))),
            App.globalDel(Concat(Bytes("Note_"),     Itob(idx.load()))),
            idx.store(idx.load() + Int(1))
        ),
        App.globalPut(Bytes("Count"), Int(0)),
        Return(Int(1))
    )

    handle_noop = Seq(
        Assert(Global.group_size() == Int(1)),
        Cond(
            [Txn.application_args[0] == Bytes("Add"),      add_item],
            [Txn.application_args[0] == Bytes("Update"),   update_item],
            [Txn.application_args[0] == Bytes("Remove"),   remove_item],
            [Txn.application_args[0] == Bytes("ClearAll"), clear_all],
        )
    )

    program = Cond(
        [Txn.application_id() == Int(0),               handle_creation],
        [Txn.on_completion()    == OnComplete.OptIn,   handle_optin],
        [Txn.on_completion()    == OnComplete.CloseOut,handle_closeout],
        [Txn.on_completion()    == OnComplete.UpdateApplication, handle_updateapp],
        [Txn.on_completion()    == OnComplete.DeleteApplication, handle_deleteapp],
        [Txn.on_completion()    == OnComplete.NoOp,    handle_noop],
    )

    return program   # <-- return the AST, not a string

def clear_state_program():
    return Seq(Return(Int(1)))  # AST for clear

if __name__ == "__main__":
    from pyteal import compileTeal, Mode

    artifacts_dir = os.path.join(os.path.dirname(__file__), "artifacts")
    os.makedirs(artifacts_dir, exist_ok=True)

    # Compile each AST exactly once
    approval_teal = compileTeal(approval_program(), mode=Mode.Application, version=5)
    clear_teal    = compileTeal(clear_state_program(), mode=Mode.Application, version=5)

    apath = os.path.join(artifacts_dir, "shoppinglist_approval.teal")
    cpath = os.path.join(artifacts_dir, "shoppinglist_clear.teal")

    with open(apath, "w") as f:
        f.write(approval_teal)
    print(" Wrote approval program to", apath)

    with open(cpath, "w") as f:
        f.write(clear_teal)
    print(" Wrote clear-state program to", cpath)
