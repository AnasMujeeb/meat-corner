import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ChefHat, Mail, Lock } from 'lucide-react';
import { authApi } from '../api/endpoints.js';
import { useAuth } from '../hooks/useAuth.js';
import Button from '../components/Button.jsx';

const schema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

export default function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const { mutate: login, isPending } = useMutation({
    mutationFn: ({ email, password }) => authApi.login(email, password),
    onSuccess: (data) => {
      queryClient.setQueryData(['auth', 'me'], data);
      navigate('/dashboard', { replace: true });
    },
    onError: (err) => {
      toast.error(err.message || 'Login failed. Check your credentials.');
    },
  });

  if (isLoading) return null;

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '8px' }}>
            <div style={{ width: 44, height: 44, background: 'var(--accent)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChefHat size={24} color="#fff" />
            </div>
          </div>
          <div className="login-brand">Meat <span>Corner</span></div>
          <div className="login-tagline">Admin Panel · Doha, Qatar</div>
        </div>

        <h1 className="login-title">Welcome back</h1>
        <p className="login-sub">Sign in to manage your restaurant.</p>

        <form onSubmit={handleSubmit((data) => login(data))} noValidate>
          <div className="form-group">
            <label className="label" htmlFor="login-email">
              Email address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={15}
                style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}
              />
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="admin@meatcorner.qa"
                className={`input${errors.email ? ' error' : ''}`}
                style={{ paddingLeft: '34px' }}
                {...register('email')}
              />
            </div>
            {errors.email && <p className="field-error" role="alert">{errors.email.message}</p>}
          </div>

          <div className="form-group">
            <label className="label" htmlFor="login-password">
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={15}
                style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}
              />
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className={`input${errors.password ? ' error' : ''}`}
                style={{ paddingLeft: '34px' }}
                {...register('password')}
              />
            </div>
            {errors.password && <p className="field-error" role="alert">{errors.password.message}</p>}
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isPending}
            style={{ width: '100%', marginTop: '8px' }}
            id="login-submit"
          >
            Sign In
          </Button>
        </form>
      </div>
    </div>
  );
}
