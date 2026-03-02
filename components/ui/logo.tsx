export const Logo = ({ className }: { className?: string }) => (
    <svg
        viewBox="50 40 112 115"
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            d="M50 60C50 48.9543 58.9543 40 70 40H130C141.046 40 150 48.9543 150 60V110C150 121.046 141.046 130 130 130H85L55 155V130C52 130 50 128 50 125V60Z"
            className="fill-blue-600" />
        <path
            d="M75 95H85L92 75L105 115L115 85L120 95H130"
            stroke="white"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <circle cx="150" cy="50" r="12" className="fill-sky-400 stroke-white" strokeWidth="4" />
    </svg>
);