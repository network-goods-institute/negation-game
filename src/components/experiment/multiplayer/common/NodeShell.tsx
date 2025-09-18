import React from 'react';
import { Handle, Position } from '@xyflow/react';

interface HandleConfig {
  id: string;
  type: 'source' | 'target';
  position: Position;
  className?: string;
  style?: React.CSSProperties;
}

interface NodeShellProps {
  handles?: HandleConfig[];
  rootRef?: React.RefObject<HTMLDivElement> | React.MutableRefObject<HTMLDivElement | null>;
  rootClassName?: string;
  rootProps?: React.HTMLAttributes<HTMLDivElement>;
  containerRef?: React.RefObject<HTMLDivElement> | React.MutableRefObject<HTMLDivElement | null>;
  containerClassName?: string;
  containerProps?: React.HTMLAttributes<HTMLDivElement>;
  wrapperRef: React.RefObject<HTMLDivElement> | React.MutableRefObject<HTMLDivElement | null>;
  wrapperClassName: string;
  wrapperProps?: React.HTMLAttributes<HTMLDivElement>;
  wrapperStyle?: React.CSSProperties;
  highlightClassName?: string;
  highlightStyle?: React.CSSProperties;
  highlightElement?: React.ReactNode;
  beforeWrapper?: React.ReactNode;
  afterWrapper?: React.ReactNode;
  children: React.ReactNode;
}

export const NodeShell: React.FC<NodeShellProps> = ({
  handles = [],
  rootRef,
  rootClassName = 'relative inline-block',
  rootProps,
  containerRef,
  containerClassName = 'relative inline-block',
  containerProps,
  wrapperRef,
  wrapperClassName,
  wrapperProps,
  wrapperStyle,
  highlightClassName,
  highlightStyle,
  highlightElement,
  beforeWrapper,
  afterWrapper,
  children,
}) => {
  const { className: rootExtraClassName, ...restRootProps } = rootProps ?? {};
  const rootClass = [rootClassName, rootExtraClassName].filter(Boolean).join(' ');

  const { className: containerExtraClassName, ...restContainerProps } = containerProps ?? {};
  const containerClass = [containerClassName, containerExtraClassName].filter(Boolean).join(' ');

  const { className: wrapperExtraClassName, ...restWrapperProps } = wrapperProps ?? {};
  const wrapperClass = [wrapperClassName, wrapperExtraClassName].filter(Boolean).join(' ');
  const highlightClass = highlightClassName ?? '';

  return (
    <>
      {handles.map((handle) => (
        <Handle
          key={handle.id}
          id={handle.id}
          type={handle.type}
          position={handle.position}
          className={handle.className ?? 'opacity-0 pointer-events-none'}
          style={handle.style}
        />
      ))}
      <div
        ref={rootRef as any}
        className={rootClass}
        {...(restRootProps as any)}
      >
        <div
          ref={containerRef as any}
          className={containerClass}
          {...(restContainerProps as any)}
        >
          {beforeWrapper}
          <div
            ref={wrapperRef as any}
            className={wrapperClass}
            style={wrapperStyle}
            {...(restWrapperProps as any)}
          >
            {highlightElement ?? (
              <span
                aria-hidden
                className={highlightClass}
                style={highlightStyle}
              />
            )}
            <div className="relative z-10">{children}</div>
          </div>
          {afterWrapper}
        </div>
      </div>
    </>
  );
};
