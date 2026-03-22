import React, { Children, ReactNode, useEffect, useState } from 'react';

interface StaggeredAnimationProps {
  children: ReactNode;
}

const StaggeredAnimation: React.FC<StaggeredAnimationProps> = ({ children }) => {
  const [animatedChildren, setAnimatedChildren] = useState<React.ReactNode[]>([]);

  useEffect(() => {
    const childrenArray = Children.toArray(children);
    const newAnimatedChildren = childrenArray.map((child, index) => {
      if (React.isValidElement(child)) {
        const props = child.props as any;
        return React.cloneElement(child, {
          ...props,
          style: {
            ...(props.style || {}),
            animationDelay: `${index * 50}ms`,
          },
          className: `${props.className || ''} animate-fade-up`
        });
      }
      return child;
    });
    setAnimatedChildren(newAnimatedChildren);
  }, [children]);

  return <>{animatedChildren}</>;
};

export default StaggeredAnimation;
