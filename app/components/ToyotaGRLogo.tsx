"use client"

// Toyota Gazoo Racing inspired car silhouette logo
export default function ToyotaGRLogo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Racing car silhouette inspired by Toyota GR Supra/GT86 */}
      <path
        d="M 10 60 L 15 50 L 20 45 L 30 42 L 40 40 L 50 40 L 60 40 L 70 42 L 80 45 L 85 50 L 90 60 L 88 65 L 85 68 L 80 70 L 75 70 L 73 68 L 72 65 L 72 62 L 70 60 L 30 60 L 28 62 L 28 65 L 27 68 L 25 70 L 20 70 L 15 68 L 12 65 Z"
        opacity="0.9"
      />
      {/* Windshield */}
      <path
        d="M 35 42 L 40 38 L 50 36 L 60 38 L 65 42 L 63 45 L 37 45 Z"
        opacity="0.7"
      />
      {/* Rear spoiler */}
      <path
        d="M 75 38 L 85 36 L 87 40 L 85 44 L 75 42 Z"
        opacity="0.8"
      />
      {/* Front splitter */}
      <path
        d="M 10 58 L 15 56 L 20 58 L 18 60 L 12 60 Z"
        opacity="0.8"
      />
      {/* Wheels */}
      <circle cx="25" cy="65" r="6" opacity="0.9" />
      <circle cx="75" cy="65" r="6" opacity="0.9" />
      {/* Wheel details */}
      <circle cx="25" cy="65" r="3" opacity="0.5" />
      <circle cx="75" cy="65" r="3" opacity="0.5" />
    </svg>
  )
}
