import { ThemedButton } from '@/components/ui/ThemedButton';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { AlertCircle, Home } from 'lucide-react';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { styles } = useTheme();

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname);
  }, [location.pathname]);

  return (
    <div className={cn('min-h-screen flex items-center justify-center p-4', styles.background)}>
      <ThemedCard className="max-w-md w-full text-center p-8">
        <div className="flex justify-center mb-6">
          <div className="h-24 w-24 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
          </div>
        </div>

        <h1 className={cn('text-4xl font-bold mb-2', styles.textClass)}>404</h1>
        <h2 className="text-xl font-semibold mb-4 text-muted-foreground">Page Not Found</h2>

        <p className="text-muted-foreground mb-8">
          Oops! The page you are looking for doesn't exist or has been moved.
        </p>

        <ThemedButton onClick={() => navigate('/')} className="w-full gap-2">
          <Home className="h-4 w-4" />
          Return to Home
        </ThemedButton>
      </ThemedCard>
    </div>
  );
};

export default NotFound;
