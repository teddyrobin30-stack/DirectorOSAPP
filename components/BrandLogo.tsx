import React from 'react';
import { Hexagon } from 'lucide-react';

interface BrandLogoProps {
    theme?: 'light' | 'dark';
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
    withText?: boolean;
}

const BrandLogo: React.FC<BrandLogoProps> = ({
    theme = 'light',
    size = 'md',
    className = '',
    withText = true
}) => {

    // Size configurations
    const sizes = {
        sm: { icon: 20, text: 'text-sm' },
        md: { icon: 28, text: 'text-xl' },
        lg: { icon: 40, text: 'text-3xl' },
        xl: { icon: 80, text: 'text-5xl md:text-7xl' },
    };

    const { icon: iconSize, text: textSize } = sizes[size];

    // Colors based on theme
    const textColor = theme === 'dark' ? 'text-white' : 'text-slate-900 dark:text-white';

    // Glow effect only for larger sizes to avoid visual clutter
    const showGlow = size === 'lg' || size === 'xl';

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <div className="relative flex items-center justify-center">
                {showGlow && (
                    <div className={`absolute inset-0 bg-amber-500 blur-${size === 'xl' ? '3xl' : 'xl'} opacity-20 rounded-full animate-pulse`}></div>
                )}
                <Hexagon
                    size={iconSize}
                    className="text-amber-500 fill-amber-500/10 stroke-[1.5] relative z-10"
                />
            </div>

            {withText && (
                <h1 className={`${textSize} font-black tracking-tight ${textColor} ${theme === 'dark' ? 'drop-shadow-lg' : ''}`}>
                    HotelOS
                </h1>
            )}
        </div>
    );
};

export default BrandLogo;
