from pyteal import *
import os

def approval_program():
    # Scratch variables for index arithmetic
    idx = ScratchVar(TealType.uint64)
    last_idx = ScratchVar(TealType.uint64)

    # On creation: initialize Count = 0 (no items yet)
    handle_creation = Seq(
        App.globalPut(Bytes("Count"), Int(0)),
        Return(Int(1))
    )

    # Disable all other lifecycle ops
    handle_optin     = Return(Int(0))
    handle_closeout  = Return(Int(0))
    handle_updateapp = Return(Int(0))
    handle_deleteapp = Return(Int(0))

    # Add operation: args = ["Add", <itemBytes>]
    add_item = Seq(
        idx.store(App.globalGet(Bytes("Count"))),  # load current count
        App.globalPut(
            Concat(Bytes("Item_"), Itob(idx.load())),
            Txn.application_args[1]                # store the new item
        ),
        App.globalPut(Bytes("Count"), idx.load() + Int(1)),  # increment
        Return(Int(1))
    )

    # Remove operation: args = ["Remove", <indexBytes>]
    remove_item = Seq(
        idx.store(Btoi(Txn.application_args[1])),              # parse index
        Assert(idx.load() < App.globalGet(Bytes("Count"))),   # must be valid
        last_idx.store(App.globalGet(Bytes("Count")) - Int(1)),
        # If removing last slot, just delete that key; otherwise swap-and-delete:
        If(
            idx.load() == last_idx.load(),
            App.globalDel(Concat(Bytes("Item_"), Itob(idx.load()))),
            Seq(
                App.globalPut(
                    Concat(Bytes("Item_"), Itob(idx.load())),
                    App.globalGet(
                        Concat(Bytes("Item_"), Itob(last_idx.load()))
                    )
                ),
                App.globalDel(Concat(Bytes("Item_"), Itob(last_idx.load())))
            )
        ),
        App.globalPut(Bytes("Count"), last_idx.load()),  # decrement
        Return(Int(1))
    )

    # NoOp handler: dispatch on first arg
    handle_noop = Seq(
        Assert(Global.group_size() == Int(1)),
        Cond(
            [Txn.application_args[0] == Bytes("Add"),    add_item],
            [Txn.application_args[0] == Bytes("Remove"), remove_item]
        )
    )

    # Main dispatcher
    program = Cond(
        [Txn.application_id() == Int(0),               handle_creation],
        [Txn.on_completion()    == OnComplete.OptIn,   handle_optin],
        [Txn.on_completion()    == OnComplete.CloseOut,handle_closeout],
        [Txn.on_completion()    == OnComplete.UpdateApplication, handle_updateapp],
        [Txn.on_completion()    == OnComplete.DeleteApplication, handle_deleteapp],
        [Txn.on_completion()    == OnComplete.NoOp,    handle_noop],
    )

    return compileTeal(program, Mode.Application, version=5)

def clear_state_program():
    # Always allow clear state
    return compileTeal(Return(Int(1)), Mode.Application, version=5)

if __name__ == "__main__":
    # Ensure output directory exists
    path = "./contracts/artifacts"
    os.makedirs(path, exist_ok=True)

    # Write approval and clear-state TEAL
    with open(os.path.join(path, "shoppinglist_approval.teal"), "w") as f:
        f.write(approval_program())

    with open(os.path.join(path, "shoppinglist_clear.teal"), "w") as f:
        f.write(clear_state_program())
