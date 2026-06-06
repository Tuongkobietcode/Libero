import type { ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion, type HTMLMotionProps, type Variants } from 'framer-motion';
import { useLocation } from 'react-router-dom';

import { getReaderTransitionKey } from '../../utils/bookDetailRoute';

const smoothEase = [0.16, 1, 0.3, 1] as const;

const routeVariants = {
  reader: {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: { duration: 0.38, ease: smoothEase },
  },
  auth: {
    initial: { opacity: 0, y: 14, scale: 0.985 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -10, scale: 0.99 },
    transition: { duration: 0.42, ease: smoothEase },
  },
} as const;

export const staggerContainerVariants: Variants = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: {
      delayChildren: 0.08,
      staggerChildren: 0.065,
    },
  },
};

export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: smoothEase },
  },
};

export function RouteTransition({
  children,
  variant = 'reader',
}: {
  children: ReactNode;
  variant?: keyof typeof routeVariants;
}) {
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const selectedVariant = routeVariants[variant];
  const transitionKey = getReaderTransitionKey(location);

  if (reduceMotion) {
    return <div className="w-full" key={transitionKey}>{children}</div>;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={transitionKey}
        initial={selectedVariant.initial}
        animate={selectedVariant.animate}
        exit={selectedVariant.exit}
        transition={selectedVariant.transition}
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function StaggerContainer({
  children,
  className,
  ...props
}: HTMLMotionProps<'div'> & {
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <div className={className}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={staggerContainerVariants}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
  ...props
}: HTMLMotionProps<'div'> & {
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <div className={className}>
        {children}
      </div>
    );
  }

  return (
    <motion.div variants={staggerItemVariants} className={className} {...props}>
      {children}
    </motion.div>
  );
}

export function StaggerList({
  children,
  className,
  ...props
}: HTMLMotionProps<'ul'> & {
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <ul className={className}>{children}</ul>;
  }

  return (
    <motion.ul
      initial="hidden"
      animate="show"
      variants={staggerContainerVariants}
      className={className}
      {...props}
    >
      {children}
    </motion.ul>
  );
}

export function StaggerListItem({
  children,
  className,
  ...props
}: HTMLMotionProps<'li'> & {
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <li className={className}>{children}</li>;
  }

  return (
    <motion.li variants={staggerItemVariants} className={className} {...props}>
      {children}
    </motion.li>
  );
}
