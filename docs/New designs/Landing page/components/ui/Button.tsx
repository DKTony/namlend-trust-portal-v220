import React from 'react';
import { useTheme } from '../../context/ThemeContext';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  children: React.ReactNode;
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  children, 
  className = '', 
  fullWidth = false,
  ...props 
}) => {
  const { styles, theme } = useTheme();

  let variantClass = '';
  if (variant === 'primary') {
    variantClass = styles.accentClass;
  } else if (variant === 'secondary') {
    variantClass = styles.buttonClass;
  } else {
    variantClass = `bg-transparent hover:bg-black/5 dark:hover:bg-white/5 ${styles.textClass}`;
  }

  // Base physics for non-Neo themes
  const physicsClass = theme === 'neo' 
    ? '' 
    : 'active:scale-95 transition-transform duration-200';

  const radiusClass = theme === 'glass' ? 'rounded-2xl' : theme === 'lux' ? 'rounded-lg' : 'rounded-md';

  return (
    <button
      className={`
        relative px-6 py-3 font-semibold flex items-center justify-center gap-2
        ${fullWidth ? 'w-full' : ''}
        ${variantClass}
        ${physicsClass}
        ${radiusClass}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;