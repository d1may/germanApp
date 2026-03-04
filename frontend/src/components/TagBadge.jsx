export default function TagBadge({ tag }) {
  return (
    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-300 border border-gray-700">
      {tag}
    </span>
  )
}
