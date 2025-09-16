import React from 'react';

export function FullBleedSection({
  children,
  className = '',
  containerClassName = '',
}: {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
}) {
  return (
    <section className={[
      'w-full',
      className,
    ].join(' ')}>
      <div className={[
        'mx-auto w-full max-w-[1200px] px-4 md:px-6',
        containerClassName,
      ].join(' ')}>
        {children}
      </div>
    </section>
  );
}

export default FullBleedSection;

