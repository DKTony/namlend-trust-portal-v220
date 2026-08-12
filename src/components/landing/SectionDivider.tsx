import React from 'react';

interface SectionDividerProps {
  position: 'top' | 'bottom';
}

const SectionDivider: React.FC<SectionDividerProps> = ({ position }) => {
  return (
    <div
      aria-hidden="true"
      className={`mx-auto h-px w-[min(92%,72rem)] bg-gradient-to-r from-transparent via-[#7CA05C]/45 to-transparent ${
        position === 'top' ? 'mt-10' : 'my-10'
      }`}
    />
  );
};

export default SectionDivider;
