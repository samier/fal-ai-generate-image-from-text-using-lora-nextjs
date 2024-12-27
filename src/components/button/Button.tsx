import React from "react";
import { ClipLoader } from "react-spinners";
import styles from './Button.module.css';

interface ButtonProps {
    label: string;
    onClick?: () => void;
    className?: string;
    isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
    label,
    onClick,
    className,
    isLoading = false,
}) => {

    return (
        <button
            className={`mt-5 p-2 bg-[#b747d0] text-white font-semibold rounded-md 
                  cursor-pointer hover:bg-[#a440b6] 
                  focus:outline-none focus:ring-2 focus:ring-[#b747d0] 
                  transition duration-300 ease-in-out 
                  ${className} ${isLoading && styles.loading_style} ${styles.app_dark_btn}`}
            onClick={onClick}>
            {label}
            <ClipLoader
                color="#fff"
                className={styles.loader}
                loading={isLoading}
                size={20}
            />
        </button>
    );
};

export default Button;
