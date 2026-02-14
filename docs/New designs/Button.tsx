import React from 'react';
import { useTheme } from '../../context/ThemeContext';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', children, className = '', ...props }) => {
  const { styles } = useTheme();

  let variantClass = '';
  
  if (variant === 'primary') {
    variantClass = `${styles.accentClass} hover:opacity-90 shadow-lg`;
  } else if (variant === 'secondary') {
    variantClass = styles.buttonClass;
  } else {
    variantClass = `bg-transparent hover:bg-white/5 ${styles.textClass}`;
  }

  return (
    <button 
      className={`
        px-6 py-3 rounded-xl font-medium transition-all duration-300 active:scale-95
        flex items-center justify-center gap-2
        ${variantClass}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
};