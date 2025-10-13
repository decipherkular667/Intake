import { useState, useEffect } from 'react';
import { usePWA } from '@/hooks/use-pwa';
import { Button } from '@/components/ui/button';
import { X, Download, Share } from 'lucide-react';

export function PWAInstallPrompt() {
  const { isInstallable, installApp } = usePWA();
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Check if already running as standalone app
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Don't show prompt if already installed
    if (standalone) return;

    // Check if user previously dismissed the prompt
    const isDismissed = localStorage.getItem('pwa-install-dismissed') === 'true';
    if (isDismissed) {
      setDismissed(true);
      return;
    }

    // Show prompt after 10 seconds if installable (Android/Desktop) or iOS
    const timer = setTimeout(() => {
      if (isInstallable || iOS) {
        setShowPrompt(true);
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [isInstallable]);

  const handleInstall = async () => {
    const installed = await installApp();
    if (installed) {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (!showPrompt || dismissed || isStandalone) {
    return null;
  }

  // iOS-specific install instructions
  if (isIOS && !isInstallable) {
    return (
      <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 animate-in slide-in-from-bottom-5">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <Share className="h-6 w-6 text-green-600" />
          </div>

          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">
              Install IntakeAI Health
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Tap <Share className="inline h-4 w-4" /> below, then "Add to Home Screen"
            </p>

            <Button
              onClick={handleDismiss}
              size="sm"
              variant="outline"
              className="w-full"
            >
              Got it
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Android/Desktop install prompt
  if (!isInstallable) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 animate-in slide-in-from-bottom-5">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
          <Download className="h-6 w-6 text-green-600" />
        </div>

        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">
            Install IntakeAI Health
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            Add to your home screen for quick access and offline functionality
          </p>

          <div className="flex gap-2">
            <Button
              onClick={handleInstall}
              size="sm"
              className="flex-1"
            >
              Install
            </Button>
            <Button
              onClick={handleDismiss}
              size="sm"
              variant="outline"
            >
              Later
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
