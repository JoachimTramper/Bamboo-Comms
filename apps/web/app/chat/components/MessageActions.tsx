"use client";

type Props = {
  isMine: boolean;
  isDeleted: boolean;
  failed?: boolean;
  menuOpen: boolean;
  onStartEdit: () => void;
  onDelete: () => void;
  onReply: () => void;
  onCloseMenu: () => void;
  menuRef?: React.RefObject<HTMLDivElement | null>;
};

export function MessageActions({
  isMine,
  isDeleted,
  failed,
  menuOpen,
  onStartEdit,
  onDelete,
  onReply,
  onCloseMenu,
  menuRef,
}: Props) {
  if (isDeleted) return null;

  return (
    <>
      {/* desktop hover actions */}
      <div className="mt-1 hidden gap-2 text-xs text-gray-500 md:group-hover:flex">
        {isMine && !failed && (
          <>
            <button className="hover:underline" onClick={onStartEdit}>
              Edit
            </button>
            <button className="hover:underline" onClick={onDelete}>
              Delete
            </button>
          </>
        )}
        <button className="hover:underline" onClick={onReply}>
          Reply
        </button>
      </div>

      {/* mobile long-press menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="md:hidden mt-1 inline-flex gap-2 text-xs text-gray-700 bg-white border rounded shadow px-2 py-1 z-10"
        >
          {isMine && !failed && (
            <>
              <button
                onClick={() => {
                  onStartEdit();
                  onCloseMenu();
                }}
              >
                Edit
              </button>
              <button
                className="text-red-600"
                onClick={() => {
                  onDelete();
                  onCloseMenu();
                }}
              >
                Delete
              </button>
            </>
          )}
          <button
            onClick={() => {
              onReply();
              onCloseMenu();
            }}
          >
            Reply
          </button>
          <button className="text-gray-400" onClick={onCloseMenu}>
            Cancel
          </button>
        </div>
      )}
    </>
  );
}
