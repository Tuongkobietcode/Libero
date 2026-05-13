import loginBackground from '../assets/Bg.png';
import registerBackground from '../assets/Bg2.png';

interface AuthBackgroundProps {
  variant?: 'login' | 'register';
}

export default function AuthBackground({ variant = 'login' }: AuthBackgroundProps) {
  const authBackground = variant === 'register' ? registerBackground : loginBackground;

  return (
    <img
      src={authBackground}
      alt=""
      aria-hidden="true"
      className="absolute inset-0 h-full w-full select-none object-cover"
    />
  );
}
