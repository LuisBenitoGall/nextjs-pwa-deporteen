import React from 'react';

interface TitleH1Props extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

export default function TitleH1({ children, className = '', ...rest }: TitleH1Props) {
  return (
    <h1
      className={`text-3xl font-bold mb-8 mt-8 text-center ${className}`.trim()}
      {...rest}
    >
      {children}
    </h1>
  );
}
