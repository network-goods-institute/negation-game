export const DoubtIcon = ({
  className,
  isFilled,
}: {
  className?: string;
  isFilled?: boolean;
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      className={className}
    >
      {/* Background fill when filled */}
      {isFilled && (
        <>
          <path
            d="M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41l-7.59-7.59a2.41 2.41 0 0 0-3.41 0Z"
            fill="currentColor"
          />
          <line
            x1="20"
            y1="4"
            x2="4"
            y2="20"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      )}

      {/* Outline */}
      <path
        d="M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41l-7.59-7.59a2.41 2.41 0 0 0-3.41 0Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
      <line
        x1="20"
        y1="4"
        x2="4"
        y2="20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
};
