import { useState, useEffect } from 'react';

export const useUserColor = (userId?: string) => {
  const [userColor, setUserColor] = useState<string>("#3b82f6");
  
  useEffect(() => {
    const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    const idBasis = (userId || 'anon') as string;
    let h = 0;
    for (let i = 0; i < idBasis.length; i++) h = (h * 31 + idBasis.charCodeAt(i)) >>> 0;
    setUserColor(colors[h % colors.length]);
  }, [userId]);
  
  return userColor;
};