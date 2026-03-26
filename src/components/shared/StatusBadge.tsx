interface StatusBadgeProps {
  status: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  active: {
    label: "Active",
    className: "bg-green-900/40 text-green-400 border border-green-800",
  },
  stopped: {
    label: "Stopped",
    className: "bg-gray-800 text-gray-400 border border-gray-700",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-gray-800 text-gray-400 border border-gray-700",
  },
  "on-hold": {
    label: "On Hold",
    className: "bg-amber-900/40 text-amber-400 border border-amber-800",
  },
  completed: {
    label: "Completed",
    className: "bg-blue-900/40 text-blue-400 border border-blue-800",
  },
  finished: {
    label: "Finished",
    className: "bg-blue-900/40 text-blue-400 border border-blue-800",
  },
  confirmed: {
    label: "Confirmed",
    className: "bg-green-900/40 text-green-400 border border-green-800",
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status.toLowerCase()] ?? {
    label: status,
    className: "bg-gray-800 text-gray-400 border border-gray-700",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
