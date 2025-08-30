"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SettingsIcon } from "lucide-react";

export interface ProviderSettings {
  provider: 'google' | 'fal';
  fluxModel: string;
}

interface SettingsDropdownProps {
  onProviderChange?: (settings: ProviderSettings) => void;
}

export function SettingsDropdown({ onProviderChange }: SettingsDropdownProps = {}) {
  const [apiKey, setApiKey] = useState("");
  const [falApiKey, setFalApiKey] = useState("");
  const [provider, setProvider] = useState<'google' | 'fal'>('google');
  const [fluxModel, setFluxModel] = useState('fal-ai/flux/dev');
  const [darkMode, setDarkMode] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showFalApiKey, setShowFalApiKey] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    // Function to load API keys from localStorage
    const loadApiKeys = () => {
      const savedApiKey = localStorage.getItem("gemini_api_key");
      const savedFalApiKey = localStorage.getItem("fal_api_key");
      setApiKey(savedApiKey || "");
      setFalApiKey(savedFalApiKey || "");
    };

    // Load saved API keys from localStorage
    loadApiKeys();

    // Load saved provider and model preferences
    const savedProvider = localStorage.getItem("openjourney-provider") as 'google' | 'fal';
    const savedFluxModel = localStorage.getItem("openjourney-flux-model");
    if (savedProvider) {
      setProvider(savedProvider);
    }
    if (savedFluxModel) {
      setFluxModel(savedFluxModel);
    }

    // Load saved dark mode preference
    const savedDarkMode = localStorage.getItem("openjourney-dark-mode");
    if (savedDarkMode !== null) {
      setDarkMode(savedDarkMode === "true");
    }

    // Listen for API key updates from other components (like the dialog)
    const handleApiKeyUpdate = () => {
      loadApiKeys();
    };

    window.addEventListener('apiKeyUpdated', handleApiKeyUpdate);

    // Cleanup event listener
    return () => {
      window.removeEventListener('apiKeyUpdated', handleApiKeyUpdate);
    };
  }, []);

  useEffect(() => {
    // Apply dark mode to document
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // Notify parent component about provider changes
  useEffect(() => {
    if (onProviderChange) {
      onProviderChange({ provider, fluxModel });
    }
  }, [provider, fluxModel, onProviderChange]);

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    localStorage.setItem("gemini_api_key", value);
    
    // Show save confirmation
    if (value.trim()) {
      setSaveStatus("Google Gemini API key saved successfully!");
      setTimeout(() => setSaveStatus(null), 3000);
    } else {
      setSaveStatus(null);
    }
  };

  const handleFalApiKeyChange = (value: string) => {
    setFalApiKey(value);
    localStorage.setItem("fal_api_key", value);
    
    // Show save confirmation
    if (value.trim()) {
      setSaveStatus("FAL.ai API key saved successfully!");
      setTimeout(() => setSaveStatus(null), 3000);
    } else {
      setSaveStatus(null);
    }
  };

  const handleProviderChange = (value: 'google' | 'fal') => {
    setProvider(value);
    localStorage.setItem("openjourney-provider", value);
    setSaveStatus(`Switched to ${value === 'google' ? 'Google AI' : 'FAL.ai'} provider`);
    setTimeout(() => setSaveStatus(null), 2000);
  };

  const handleFluxModelChange = (value: string) => {
    setFluxModel(value);
    localStorage.setItem("openjourney-flux-model", value);
    setSaveStatus(`FLUX model updated to ${value.split('/').pop()}`);
    setTimeout(() => setSaveStatus(null), 2000);
  };

  const handleDarkModeToggle = (checked: boolean) => {
    setDarkMode(checked);
    localStorage.setItem("openjourney-dark-mode", checked.toString());
    
    if (checked) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleClearApiKey = () => {
    setApiKey("");
    localStorage.removeItem("gemini_api_key");
    setSaveStatus("Google Gemini API key cleared");
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleClearFalApiKey = () => {
    setFalApiKey("");
    localStorage.removeItem("fal_api_key");
    setSaveStatus("FAL.ai API key cleared");
    setTimeout(() => setSaveStatus(null), 3000);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <SettingsIcon className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-w-[calc(100vw-2rem)] p-4">
        <div className="space-y-4">
          {/* Provider Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              AI Provider
            </Label>
            <Select value={provider} onValueChange={handleProviderChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="google">Google AI (Gemini)</SelectItem>
                <SelectItem value="fal">FAL.ai (FLUX)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DropdownMenuSeparator />

          {/* Google AI API Key Section */}
          {provider === 'google' && (
            <div className="space-y-2">
              <Label htmlFor="api-key" className="text-sm font-medium">
                Google Gemini API Key
              </Label>
              <div className="space-y-2">
                <Input
                  id="api-key"
                  type={showApiKey ? "text" : "password"}
                  placeholder="Enter your Google Gemini API key..."
                  value={apiKey}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  className="text-xs"
                />
                <div className="flex justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="text-xs h-7"
                  >
                    {showApiKey ? "Hide" : "Show"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearApiKey}
                    className="text-xs h-7"
                  >
                    Clear
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Get your Google Gemini API key from{" "}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Google AI Studio
                </a>
              </p>
            </div>
          )}

          {/* FAL.ai Configuration Section */}
          {provider === 'fal' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="fal-api-key" className="text-sm font-medium">
                  FAL.ai API Key
                </Label>
                <div className="space-y-2">
                  <Input
                    id="fal-api-key"
                    type={showFalApiKey ? "text" : "password"}
                    placeholder="Enter your FAL.ai API key..."
                    value={falApiKey}
                    onChange={(e) => handleFalApiKeyChange(e.target.value)}
                    className="text-xs"
                  />
                  <div className="flex justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowFalApiKey(!showFalApiKey)}
                      className="text-xs h-7"
                    >
                      {showFalApiKey ? "Hide" : "Show"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearFalApiKey}
                      className="text-xs h-7"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Get your FAL.ai API key from{" "}
                  <a
                    href="https://fal.ai/dashboard/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    FAL.ai Dashboard
                  </a>
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  FLUX Model
                </Label>
                <Select value={fluxModel} onValueChange={handleFluxModelChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select FLUX model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fal-ai/flux/schnell">FLUX Schnell (Fastest)</SelectItem>
                    <SelectItem value="fal-ai/flux/dev">FLUX Dev (Balanced)</SelectItem>
                    <SelectItem value="fal-ai/flux-pro">FLUX Pro (Highest Quality)</SelectItem>
                    <SelectItem value="fal-ai/flux-pro/kontext">FLUX Kontext (Image-to-Image)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Choose the FLUX model based on your needs: Schnell for speed, Pro for quality, Kontext for image editing
                </p>
              </div>
            </>
          )}

          {saveStatus && (
            <div className="p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
              <p className="text-xs text-green-600 dark:text-green-400">
                {saveStatus}
              </p>
            </div>
          )}

          <DropdownMenuSeparator />

          {/* Dark Mode Section */}
          <div className="flex items-center justify-between py-2">
            <Label htmlFor="dark-mode" className="text-sm font-medium">
              Dark Mode
            </Label>
            <Switch
              id="dark-mode"
              checked={darkMode}
              onCheckedChange={handleDarkModeToggle}
            />
          </div>

          {/* GitHub Section */}
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open("https://github.com/ammaarreshi/openjourney", "_blank")}
              className="w-full text-sm"
            >
              Fork and remix on GitHub
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 