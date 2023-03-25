import { useEffect } from 'react';

export default function useExitPrompt(uploading, onConfirm) {
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (uploading) {
        event.preventDefault();
        event.returnValue = "";
      }
    };

    window.addEventListener('unload', onConfirm)

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.addEventListener('unload', onConfirm)
    };
  }, [uploading, onConfirm]);
}

