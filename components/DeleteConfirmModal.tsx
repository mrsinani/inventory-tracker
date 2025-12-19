interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemName: string;
  onConfirm: () => void;
}

export default function DeleteConfirmModal({ isOpen, onClose, itemName, onConfirm }: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Confirm Delete</h2>
          <p className="text-gray-600">
            Are you sure you want to delete <span className="font-medium">{itemName}</span>?
            This action cannot be undone.
          </p>
        </div>

        <div className="px-6 py-4 bg-gray-50 flex gap-3 rounded-b-lg">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
