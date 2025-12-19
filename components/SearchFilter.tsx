interface SearchFilterProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  departmentFilter: string;
  onDepartmentChange: (value: string) => void;
  roomFilter: string;
  onRoomChange: (value: string) => void;
  showLowStockOnly: boolean;
  onLowStockToggle: (value: boolean) => void;
  departments: string[];
  rooms: string[];
  onAddItem: () => void;
}

export default function SearchFilter({
  searchTerm,
  onSearchChange,
  departmentFilter,
  onDepartmentChange,
  roomFilter,
  onRoomChange,
  showLowStockOnly,
  onLowStockToggle,
  departments,
  rooms,
  onAddItem
}: SearchFilterProps) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search items, vendor, or department..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <select
          value={departmentFilter}
          onChange={(e) => onDepartmentChange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          <option value="">All Departments</option>
          {departments.map((dept) => (
            <option key={dept} value={dept}>
              {dept}
            </option>
          ))}
        </select>

        <select
          value={roomFilter}
          onChange={(e) => onRoomChange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          <option value="">All Rooms</option>
          {rooms.map((room) => (
            <option key={room} value={room}>
              {room}
            </option>
          ))}
        </select>

        <button
          onClick={onAddItem}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Add Item
        </button>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="lowStockOnly"
          checked={showLowStockOnly}
          onChange={(e) => onLowStockToggle(e.target.checked)}
          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
        />
        <label htmlFor="lowStockOnly" className="ml-2 text-sm text-gray-700">
          Show low stock items only
        </label>
      </div>
    </div>
  );
}
