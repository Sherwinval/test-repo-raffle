import { useEffect, useMemo, useState } from 'react';

const MAX_IMAGE_SIZE = 3 * 1024 * 1024;

const themePresets = {
  Professional: {
    colors: {
      primary: '#1e3a8a',
      secondary: '#f8fafc',
      accent: '#f97316',
      background: '#f8fafc',
      card: '#ffffff',
      text: '#0f172a',
      button: '#1d4ed8',
      wheelSegments: ['#1d4ed8', '#2563eb', '#0284c7', '#9333ea', '#f97316', '#14b8a6']
    }
  },
  Corporate: {
    colors: {
      primary: '#0f172a',
      secondary: '#e2e8f0',
      accent: '#0ea5e9',
      background: '#eef2ff',
      card: '#ffffff',
      text: '#0f172a',
      button: '#0ea5e9',
      wheelSegments: ['#0f172a', '#64748b', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6']
    }
  },
  Party: {
    colors: {
      primary: '#be185d',
      secondary: '#fdf2f8',
      accent: '#f59e0b',
      background: '#fff7ed',
      card: '#ffffff',
      text: '#111827',
      button: '#ec4899',
      wheelSegments: ['#ec4899', '#f97316', '#facc15', '#22c55e', '#0ea5e9', '#8b5cf6']
    }
  },
  Luxury: {
    colors: {
      primary: '#111827',
      secondary: '#f8fafc',
      accent: '#d97706',
      background: '#fafafa',
      card: '#ffffff',
      text: '#111827',
      button: '#d97706',
      wheelSegments: ['#111827', '#4b5563', '#b91c1c', '#d97706', '#f59e0b', '#6d28d9']
    }
  },
  Festival: {
    colors: {
      primary: '#0f172a',
      secondary: '#f8fafc',
      accent: '#ec4899',
      background: '#eef2ff',
      card: '#ffffff',
      text: '#0f172a',
      button: '#6366f1',
      wheelSegments: ['#ec4899', '#f97316', '#22c55e', '#38bdf8', '#a855f7', '#facc15']
    }
  },
  Gaming: {
    colors: {
      primary: '#0f172a',
      secondary: '#0f172a',
      accent: '#14b8a6',
      background: '#030712',
      card: '#111827',
      text: '#f8fafc',
      button: '#14b8a6',
      wheelSegments: ['#14b8a6', '#0ea5e9', '#f97316', '#8b5cf6', '#84cc16', '#e11d48']
    }
  },
  Elegant: {
    colors: {
      primary: '#0f172a',
      secondary: '#f8fafc',
      accent: '#6d28d9',
      background: '#f8fafc',
      card: '#ffffff',
      text: '#0f172a',
      button: '#6d28d9',
      wheelSegments: ['#6d28d9', '#4338ca', '#2563eb', '#0ea5e9', '#22c55e', '#facc15']
    }
  },
  Minimal: {
    colors: {
      primary: '#111827',
      secondary: '#f8fafc',
      accent: '#64748b',
      background: '#ffffff',
      card: '#f8fafc',
      text: '#111827',
      button: '#64748b',
      wheelSegments: ['#111827', '#475569', '#64748b', '#94a3b8', '#cbd5e1', '#d1d5db']
    }
  }
};

const defaultPrizes = [
  { id: 1, label: 'Top Prize', name: 'Top Prize', description: '', winnerCount: 1, imageFile: null, imageUrl: '' },
  { id: 2, label: 'Second Prize', name: 'Second Prize', description: '', winnerCount: 2, imageFile: null, imageUrl: '' },
  { id: 3, label: 'Third Prize', name: 'Third Prize', description: '', winnerCount: 3, imageFile: null, imageUrl: '' },
  { id: 4, label: 'Major Prize', name: 'Major Prize', description: '', winnerCount: 5, imageFile: null, imageUrl: '' },
  { id: 5, label: 'Minor Prize', name: 'Minor Prize', description: '', winnerCount: 20, imageFile: null, imageUrl: '' },
  { id: 6, label: 'Consolation Prize', name: 'Consolation Prize', description: '', winnerCount: 100, imageFile: null, imageUrl: '' }
];

const defaultCustomization = {
  brand: {
    logoFile: null,
    logoUrl: '',
    bannerFile: null,
    bannerUrl: '',
    brandName: '',
    companyName: '',
    organizerName: '',
    tagline: 'Annual Christmas Mega Raffle',
    themeName: ''
  },
  themePreset: 'Professional',
  colors: {
    primary: themePresets.Professional.colors.primary,
    secondary: themePresets.Professional.colors.secondary,
    accent: themePresets.Professional.colors.accent,
    background: themePresets.Professional.colors.background,
    card: themePresets.Professional.colors.card,
    text: themePresets.Professional.colors.text,
    button: themePresets.Professional.colors.button,
    wheelSegments: [...themePresets.Professional.colors.wheelSegments]
  },
  wheel: {
    style: 'Classic Wheel',
    borderThickness: 6,
    borderStyle: 'solid',
    pointerStyle: 'Classic',
    pointerColor: themePresets.Professional.colors.accent,
    centerLogo: true,
    fontStyle: 'Inter',
    fontSize: 14,
    labelStyle: 'Bold',
    spinAnimation: 'Normal'
  },
  spin: {
    mode: 'single',
    totalSpins: 1,
    duration: 'Normal',
    customSeconds: 8,
    autoStart: false,
    manualSpin: true,
    countdown: true,
    sound: true,
    celebration: true
  },
  prizes: defaultPrizes,
  allocation: {
    totalWinnersAllowed: 131,
    autoDisable: true,
    preventDuplicate: true
  }
};

const availableSections = ['Branding', 'Colors', 'Wheel', 'Spin', 'Prizes', 'Winners', 'Preview'];
const wheelStyles = ['Classic Wheel', 'Modern Wheel', 'Neon Wheel', 'Corporate Wheel', 'Elegant Wheel', 'Party Wheel', 'Minimal Wheel', 'Premium Wheel', 'Custom Theme Wheel'];
const fontOptions = ['Inter', 'Poppins', 'Montserrat', 'Playfair Display', 'Space Grotesk'];
const durationOptions = [
  { label: 'Fast', value: 'Fast', seconds: 3 },
  { label: 'Normal', value: 'Normal', seconds: 8 },
  { label: 'Slow', value: 'Slow', seconds: 14 },
  { label: 'Custom', value: 'Custom', seconds: 0 }
];

const validateImageFile = (file) => {
  if (!file) return 'No file selected.';
  const allowed = ['image/jpeg', 'image/png', 'image/svg+xml'];
  if (!allowed.includes(file.type)) return 'Accept JPG, PNG, or SVG only.';
  if (file.size > MAX_IMAGE_SIZE) return 'Image too large; max 3MB.';
  return null;
};

const formatWinnerCount = (value) => {
  const numberValue = Number(value);
  if (Number.isNaN(numberValue) || numberValue < 0) return 0;
  return Math.floor(numberValue);
};

export default function EventCustomizationWizard({ event, onClose, onPublish }) {
  const [activeSection, setActiveSection] = useState('Branding');
  const [customization, setCustomization] = useState(defaultCustomization);
  const [message, setMessage] = useState('');
  const [imageError, setImageError] = useState('');

  const prizeTotal = useMemo(
    () => customization.prizes.reduce((sum, prize) => sum + formatWinnerCount(prize.winnerCount), 0),
    [customization.prizes]
  );

  const remainingSlots = useMemo(
    () => Math.max(customization.allocation.totalWinnersAllowed - prizeTotal, 0),
    [customization.allocation.totalWinnersAllowed, prizeTotal]
  );

  useEffect(() => {
    return () => {
      if (customization.brand.logoUrl) URL.revokeObjectURL(customization.brand.logoUrl);
      if (customization.brand.bannerUrl) URL.revokeObjectURL(customization.brand.bannerUrl);
      customization.prizes.forEach((prize) => prize.imageUrl && URL.revokeObjectURL(prize.imageUrl));
    };
  }, [customization.brand.logoUrl, customization.brand.bannerUrl, customization.prizes]);

  const applyPreset = (presetKey) => {
    const preset = themePresets[presetKey];
    if (!preset) return;
    setCustomization((prev) => ({
      ...prev,
      themePreset: presetKey,
      brand: {
        ...prev.brand,
        themeName: presetKey
      },
      colors: {
        ...preset.colors,
        wheelSegments: [...preset.colors.wheelSegments]
      },
      wheel: {
        ...prev.wheel,
        pointerColor: preset.colors.accent
      }
    }));
  };

  const handleColorChange = (field, value) => {
    setCustomization((prev) => ({
      ...prev,
      themePreset: 'Custom',
      colors: {
        ...prev.colors,
        [field]: value
      }
    }));
  };

  const handleWheelSegmentChange = (index, value) => {
    setCustomization((prev) => {
      const segments = [...prev.colors.wheelSegments];
      segments[index] = value;
      return {
        ...prev,
        themePreset: 'Custom',
        colors: {
          ...prev.colors,
          wheelSegments: segments
        }
      };
    });
  };

  const handleBrandUpdate = (field, value) => {
    setCustomization((prev) => ({
      ...prev,
      themePreset: prev.themePreset === 'Custom' ? 'Custom' : prev.themePreset,
      brand: {
        ...prev.brand,
        [field]: value
      }
    }));
  };

  const handleImageUpload = (field, file) => {
    const error = validateImageFile(file);
    if (error) {
      setImageError(error);
      return;
    }
    setImageError('');
    const url = URL.createObjectURL(file);
    setCustomization((prev) => {
      const updated = { ...prev };
      if (field === 'logo' || field === 'banner') {
        const existingUrl = prev.brand[field === 'logo' ? 'logoUrl' : 'bannerUrl'];
        if (existingUrl) URL.revokeObjectURL(existingUrl);
        updated.brand = {
          ...prev.brand,
          [`${field}File`]: file,
          [`${field}Url`]: url
        };
      }
      return updated;
    });
  };

  const handlePrizeImageUpload = (index, file) => {
    const error = validateImageFile(file);
    if (error) {
      setImageError(error);
      return;
    }
    setImageError('');
    const url = URL.createObjectURL(file);
    setCustomization((prev) => {
      const prizes = prev.prizes.map((prize, prizeIndex) => {
        if (prizeIndex !== index) return prize;
        if (prize.imageUrl) URL.revokeObjectURL(prize.imageUrl);
        return {
          ...prize,
          imageFile: file,
          imageUrl: url
        };
      });
      return { ...prev, prizes };
    });
  };

  const removePrizeImage = (index) => {
    setCustomization((prev) => {
      const prizes = prev.prizes.map((prize, prizeIndex) => {
        if (prizeIndex !== index) return prize;
        if (prize.imageUrl) URL.revokeObjectURL(prize.imageUrl);
        return { ...prize, imageFile: null, imageUrl: '' };
      });
      return { ...prev, prizes };
    });
  };

  const removeBrandAsset = (field) => {
    setCustomization((prev) => {
      const key = field === 'logo' ? 'logoUrl' : 'bannerUrl';
      if (prev.brand[key]) URL.revokeObjectURL(prev.brand[key]);
      return {
        ...prev,
        brand: {
          ...prev.brand,
          [`${field}File`]: null,
          [key]: ''
        }
      };
    });
  };

  const updatePrize = (index, field, value) => {
    setCustomization((prev) => {
      const prizes = prev.prizes.map((prize, prizeIndex) => {
        if (prizeIndex !== index) return prize;
        return {
          ...prize,
          [field]: field === 'winnerCount' ? formatWinnerCount(value) : value
        };
      });
      return { ...prev, prizes };
    });
  };

  const reorderPrize = (index, direction) => {
    setCustomization((prev) => {
      const prizes = [...prev.prizes];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prizes.length) return prev;
      [prizes[index], prizes[targetIndex]] = [prizes[targetIndex], prizes[index]];
      return { ...prev, prizes };
    });
  };

  const addPrize = () => {
    setCustomization((prev) => ({
      ...prev,
      prizes: [
        ...prev.prizes,
        {
          id: Date.now(),
          label: 'Custom Prize',
          name: 'Custom Prize',
          description: '',
          winnerCount: 1,
          imageFile: null,
          imageUrl: ''
        }
      ]
    }));
    setActiveSection('Prizes');
  };

  const deletePrize = (index) => {
    setCustomization((prev) => {
      const prizeToRemove = prev.prizes[index];
      if (prizeToRemove?.imageUrl) URL.revokeObjectURL(prizeToRemove.imageUrl);
      return {
        ...prev,
        prizes: prev.prizes.filter((_, prizeIndex) => prizeIndex !== index)
      };
    });
  };

  const saveCustomization = () => {
    setMessage('Customization saved locally. Use Publish Event when ready.');
  };

  const publishEvent = async () => {
    setMessage('Publishing event...');
    if (!event?.id) {
      setMessage('Event ID is missing. Unable to publish.');
      return;
    }

    try {
      const response = await fetch(`/api/events/${event.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        setMessage(errorBody.error || 'Failed to publish event.');
        return;
      }

      const publishedEvent = await response.json();
      setMessage('Event customization published.');
      onPublish?.(publishedEvent.id);
    } catch (err) {
      console.error('Publish event failed:', err);
      setMessage('Failed to publish event.');
    }
  };

  const resetDefaultColors = () => {
    applyPreset('Professional');
  };

  const renderBrandingSection = () => (
    <div className="soft-card wizard-section-card">
      <div className="wizard-section-header">
        <div>
          <p className="card-heading">Event Branding & Identity</p>
          <p className="card-copy">Upload logo/banner assets and enter brand details manually to keep the event styling in sync.</p>
        </div>
      </div>

      <div className="wizard-form-grid">
        <div>
          <div className="field">
            <label className="field-label">Event Logo Upload</label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              className="file-input"
              onChange={(e) => {
                if (!e.target.files?.[0]) return;
                handleImageUpload('logo', e.target.files[0]);
              }}
            />
          </div>
          {customization.brand.logoUrl && (
            <div className="wizard-image-preview">
              <img src={customization.brand.logoUrl} alt="Event logo preview" />
              <button type="button" className="btn-ghost-sm" onClick={() => removeBrandAsset('logo')}>Remove logo</button>
            </div>
          )}

          <div className="field">
            <label className="field-label">Event Banner / Header Image</label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              className="file-input"
              onChange={(e) => {
                if (!e.target.files?.[0]) return;
                handleImageUpload('banner', e.target.files[0]);
              }}
            />
          </div>
          {customization.brand.bannerUrl && (
            <div className="wizard-image-preview">
              <img src={customization.brand.bannerUrl} alt="Event banner preview" />
              <button type="button" className="btn-ghost-sm" onClick={() => removeBrandAsset('banner')}>Remove banner</button>
            </div>
          )}
        </div>

        <div className="wizard-brand-fields">
          <div className="field">
            <label className="field-label">Brand / Organizer Name</label>
            <input
              className="event-input"
              value={customization.brand.brandName}
              onChange={(e) => handleBrandUpdate('brandName', e.target.value)}
              placeholder="Acme Events"
            />
          </div>

          <div className="field">
            <label className="field-label">Company Name</label>
            <input
              className="event-input"
              value={customization.brand.companyName}
              onChange={(e) => handleBrandUpdate('companyName', e.target.value)}
              placeholder="Acme Corporation"
            />
          </div>

          <div className="field">
            <label className="field-label">Organizer Name</label>
            <input
              className="event-input"
              value={customization.brand.organizerName}
              onChange={(e) => handleBrandUpdate('organizerName', e.target.value)}
              placeholder="Raffle Organizer"
            />
          </div>

          <div className="field">
            <label className="field-label">Event Tagline / Subtitle</label>
            <input
              className="event-input"
              value={customization.brand.tagline}
              onChange={(e) => handleBrandUpdate('tagline', e.target.value)}
              placeholder="Annual Christmas Mega Raffle"
            />
          </div>

          <div className="field">
            <label className="field-label">Branding Theme Name</label>
            <input
              className="event-input"
              value={customization.brand.themeName}
              onChange={(e) => handleBrandUpdate('themeName', e.target.value)}
              placeholder="Professional, Party, Custom theme"
            />
          </div>

          <div className="wizard-presets">
            <p className="field-label">Branding Theme Presets</p>
            <div className="preset-grid">
              {Object.keys(themePresets).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`wizard-preset-pill${customization.themePreset === preset ? ' wizard-preset-pill--active' : ''}`}
                  onClick={() => applyPreset(preset)}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="card-copy">Choose a preset to apply a matching color palette, then fine tune the visual identity.</p>
      {imageError && <div className="error-card">{imageError}</div>}
    </div>
  );

  const renderColorsSection = () => (
    <div className="wizard-section-card">
      <div className="wizard-section-header">
        <div>
          <p className="card-heading">Color Palette Customization</p>
          <p className="card-copy">Change the event theme and wheel segment colors with live preview.</p>
        </div>
        <button type="button" className="btn-ghost" onClick={resetDefaultColors}>Reset defaults</button>
      </div>

      <div className="color-grid">
        {[
          { label: 'Primary Color', key: 'primary' },
          { label: 'Secondary Color', key: 'secondary' },
          { label: 'Accent Color', key: 'accent' },
          { label: 'Background Color', key: 'background' },
          { label: 'Card Color', key: 'card' },
          { label: 'Text Color', key: 'text' },
          { label: 'Button Color', key: 'button' }
        ].map((item) => (
          <div key={item.key} className="color-field">
            <label className="field-label">{item.label}</label>
            <div className="color-control-row">
              <input
                type="color"
                value={customization.colors[item.key]}
                onChange={(e) => handleColorChange(item.key, e.target.value)}
              />
              <input
                type="text"
                className="event-input"
                maxLength={7}
                value={customization.colors[item.key]}
                onChange={(e) => handleColorChange(item.key, e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="color-segment-grid">
        <p className="field-label">Wheel Segment Colors</p>
        <div className="segment-swatch-grid">
          {customization.colors.wheelSegments.map((segment, index) => (
            <div key={index} className="color-field">
              <label className="field-label">Segment {index + 1}</label>
              <div className="color-control-row">
                <input
                  type="color"
                  value={segment}
                  onChange={(e) => handleWheelSegmentChange(index, e.target.value)}
                />
                <input
                  type="text"
                  className="event-input"
                  maxLength={7}
                  value={segment}
                  onChange={(e) => handleWheelSegmentChange(index, e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderWheelSection = () => (
    <div className="wizard-section-card">
      <div className="wizard-section-header">
        <div>
          <p className="card-heading">Raffle Wheel Style</p>
          <p className="card-copy">Choose a wheel design and fine tune the pointer, border, and label style.</p>
        </div>
      </div>

      <div className="wizard-form-grid">
        <div>
          <p className="field-label">Wheel Style Options</p>
          <div className="preset-grid">
            {wheelStyles.map((option) => (
              <button
                key={option}
                type="button"
                className={`wizard-preset-pill${customization.wheel.style === option ? ' wizard-preset-pill--active' : ''}`}
                onClick={() => setCustomization((prev) => ({ ...prev, wheel: { ...prev.wheel, style: option } }))}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="field-group">
            <label className="field-label">Border Thickness</label>
            <input
              type="range"
              min="2"
              max="16"
              value={customization.wheel.borderThickness}
              onChange={(e) => setCustomization((prev) => ({ ...prev, wheel: { ...prev.wheel, borderThickness: Number(e.target.value) } }))}
            />
            <p className="tiny-copy">{customization.wheel.borderThickness}px</p>
          </div>

          <div className="field-group">
            <label className="field-label">Border Style</label>
            <select
              className="event-input"
              value={customization.wheel.borderStyle}
              onChange={(e) => setCustomization((prev) => ({ ...prev, wheel: { ...prev.wheel, borderStyle: e.target.value } }))}
            >
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="double">Double</option>
            </select>
          </div>

          <div className="field-group">
            <label className="field-label">Pointer Style</label>
            <select
              className="event-input"
              value={customization.wheel.pointerStyle}
              onChange={(e) => setCustomization((prev) => ({ ...prev, wheel: { ...prev.wheel, pointerStyle: e.target.value } }))}
            >
              <option>Classic</option>
              <option>Arrow</option>
              <option>Neon</option>
              <option>Minimal</option>
            </select>
          </div>

          <div className="field-group">
            <label className="field-label">Pointer Color</label>
            <div className="color-control-row">
              <input
                type="color"
                value={customization.wheel.pointerColor}
                onChange={(e) => setCustomization((prev) => ({ ...prev, wheel: { ...prev.wheel, pointerColor: e.target.value } }))}
              />
              <input
                type="text"
                className="event-input"
                value={customization.wheel.pointerColor}
                onChange={(e) => setCustomization((prev) => ({ ...prev, wheel: { ...prev.wheel, pointerColor: e.target.value } }))}
              />
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">Font Style</label>
            <select
              className="event-input"
              value={customization.wheel.fontStyle}
              onChange={(e) => setCustomization((prev) => ({ ...prev, wheel: { ...prev.wheel, fontStyle: e.target.value } }))}
            >
              {fontOptions.map((font) => (
                <option key={font} value={font}>{font}</option>
              ))}
            </select>
          </div>

          <div className="field-group">
            <label className="field-label">Font Size</label>
            <input
              type="number"
              className="event-input"
              min="10"
              max="24"
              value={customization.wheel.fontSize}
              onChange={(e) => setCustomization((prev) => ({ ...prev, wheel: { ...prev.wheel, fontSize: Number(e.target.value) } }))}
            />
          </div>

          <div className="field-group">
            <label className="field-label">Prize Label Appearance</label>
            <select
              className="event-input"
              value={customization.wheel.labelStyle}
              onChange={(e) => setCustomization((prev) => ({ ...prev, wheel: { ...prev.wheel, labelStyle: e.target.value } }))}
            >
              <option>Bold</option>
              <option>Italic</option>
              <option>Outline</option>
              <option>Soft</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSpinSection = () => (
    <div className="wizard-section-card">
      <div className="wizard-section-header">
        <div>
          <p className="card-heading">Spin Configuration</p>
          <p className="card-copy">Control how the wheel spins, countdown behavior and celebration effects.</p>
        </div>
      </div>

      <div className="wizard-form-grid">
        <div>
          <p className="field-label">Number of Spins</p>
          <div className="radio-grid">
            {[
              { label: 'Single spin only', value: 'single' },
              { label: 'Multiple spins', value: 'multiple' },
              { label: 'Unlimited', value: 'unlimited' }
            ].map((option) => (
              <label key={option.value} className="wizard-radio">
                <input
                  type="radio"
                  name="spinMode"
                  value={option.value}
                  checked={customization.spin.mode === option.value}
                  onChange={() => setCustomization((prev) => ({ ...prev, spin: { ...prev.spin, mode: option.value, totalSpins: option.value === 'single' ? 1 : prev.spin.totalSpins } }))}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          {customization.spin.mode === 'multiple' && (
            <div className="field-group">
              <label className="field-label">Total spins allowed</label>
              <input
                type="number"
                min="1"
                className="event-input"
                value={customization.spin.totalSpins}
                onChange={(e) => setCustomization((prev) => ({ ...prev, spin: { ...prev.spin, totalSpins: Math.max(1, Number(e.target.value) || 1) } }))}
              />
            </div>
          )}

          <div className="field-group">
            <label className="field-label">Spin Duration</label>
            <select
              className="event-input"
              value={customization.spin.duration}
              onChange={(e) => setCustomization((prev) => ({ ...prev, spin: { ...prev.spin, duration: e.target.value } }))}
            >
              {durationOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          {customization.spin.duration === 'Custom' && (
            <div className="field-group">
              <label className="field-label">Custom duration (seconds)</label>
              <input
                type="number"
                min="1"
                className="event-input"
                value={customization.spin.customSeconds}
                onChange={(e) => setCustomization((prev) => ({ ...prev, spin: { ...prev.spin, customSeconds: Math.max(1, Number(e.target.value) || 1) } }))}
              />
            </div>
          )}

          <div className="toggle-grid">
            {[
              { label: 'Auto-start spin', key: 'autoStart' },
              { label: 'Manual spin', key: 'manualSpin' },
              { label: 'Show spin countdown', key: 'countdown' },
              { label: 'Play spin sound', key: 'sound' },
              { label: 'Celebration animation', key: 'celebration' }
            ].map((option) => (
              <label key={option.key} className="wizard-toggle">
                <input
                  type="checkbox"
                  checked={customization.spin[option.key]}
                  onChange={(e) => setCustomization((prev) => ({ ...prev, spin: { ...prev.spin, [option.key]: e.target.checked } }))}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderPrizesSection = () => (
    <div className="wizard-section-card">
      <div className="wizard-section-header">
        <div>
          <p className="card-heading">Prize Management System</p>
          <p className="card-copy">Add, rename, reorder and configure prize categories for the raffle.</p>
        </div>
        <button type="button" className="btn-primary action-btn" onClick={addPrize}>Add prize</button>
      </div>

      <div className="prize-list">
        {customization.prizes.map((prize, index) => (
          <div key={prize.id} className="prize-card">
            <div className="prize-card-header">
              <div>
                <p className="card-subheading">{prize.label}</p>
                <p className="tiny-copy">Winner count: {prize.winnerCount}</p>
              </div>
              <div className="prize-card-actions">
                <button type="button" className="btn-ghost-sm" onClick={() => reorderPrize(index, -1)} disabled={index === 0}>Up</button>
                <button type="button" className="btn-ghost-sm" onClick={() => reorderPrize(index, 1)} disabled={index === customization.prizes.length - 1}>Down</button>
                <button type="button" className="btn-danger-sm" onClick={() => deletePrize(index)}>Delete</button>
              </div>
            </div>

            <div className="wizard-form-grid prize-grid">
              <div>
                <label className="field-label">Prize Name</label>
                <input
                  className="event-input"
                  value={prize.name}
                  onChange={(e) => updatePrize(index, 'name', e.target.value)}
                />
              </div>
              <div>
                <label className="field-label">Prize Description</label>
                <input
                  className="event-input"
                  value={prize.description}
                  onChange={(e) => updatePrize(index, 'description', e.target.value)}
                  placeholder="Optional details"
                />
              </div>
              <div>
                <label className="field-label">Winner Count</label>
                <input
                  type="number"
                  min="0"
                  className="event-input"
                  value={prize.winnerCount}
                  onChange={(e) => updatePrize(index, 'winnerCount', e.target.value)}
                />
              </div>
              <div>
                <label className="field-label">Prize Image</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml"
                  className="file-input"
                  onChange={(e) => {
                    if (!e.target.files?.[0]) return;
                    handlePrizeImageUpload(index, e.target.files[0]);
                  }}
                />
                {prize.imageUrl && (
                  <div className="wizard-image-preview prize-image-preview">
                    <img src={prize.imageUrl} alt={`${prize.name} preview`} />
                    <button type="button" className="btn-ghost-sm" onClick={() => removePrizeImage(index)}>Remove</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderWinnersSection = () => (
    <div className="wizard-section-card">
      <div className="wizard-section-header">
        <div>
          <p className="card-heading">Winner Allocation Settings</p>
          <p className="card-copy">Define how winners are distributed and prevent duplicates in the draw.</p>
        </div>
      </div>

      <div className="wizard-form-grid">
        <div>
          <label className="field-label">Total winners allowed</label>
          <input
            type="number"
            min="1"
            className="event-input"
            value={customization.allocation.totalWinnersAllowed}
            onChange={(e) => setCustomization((prev) => ({
              ...prev,
              allocation: {
                ...prev.allocation,
                totalWinnersAllowed: Math.max(1, Number(e.target.value) || 1)
              }
            }))}
          />

          <div className="toggle-grid">
            <label className="wizard-toggle">
              <input
                type="checkbox"
                checked={customization.allocation.autoDisable}
                onChange={(e) => setCustomization((prev) => ({ ...prev, allocation: { ...prev.allocation, autoDisable: e.target.checked } }))}
              />
              <span>Auto-disable prize when limit reached</span>
            </label>
            <label className="wizard-toggle">
              <input
                type="checkbox"
                checked={customization.allocation.preventDuplicate}
                onChange={(e) => setCustomization((prev) => ({ ...prev, allocation: { ...prev.allocation, preventDuplicate: e.target.checked } }))}
              />
              <span>Prevent duplicate winners</span>
            </label>
          </div>
        </div>

        <div className="winner-summary-card">
          <p className="card-subheading">Summary</p>
          <p className="card-copy">Total prize winners allocated: {prizeTotal}</p>
          <p className="card-copy">Remaining winner slots: {remainingSlots}</p>
          <div className="winner-list">
            {customization.prizes.map((prize) => (
              <div key={prize.id} className="winner-list-item">
                <span>{prize.name}</span>
                <strong>{prize.winnerCount}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderPreviewSection = () => (
    <div className="wizard-preview-full">
      <div className="soft-card wizard-preview-card" style={{ color: customization.colors.text }}>
        {customization.brand.bannerUrl ? (
          <div className="wizard-preview-banner" style={{ backgroundImage: `url(${customization.brand.bannerUrl})` }} />
        ) : (
          <div className="wizard-preview-banner wizard-preview-banner--empty">Event banner preview</div>
        )}
        <div className="wizard-preview-header" style={{ color: customization.colors.text }}>
          {customization.brand.logoUrl && <img className="wizard-preview-logo" src={customization.brand.logoUrl} alt="Event logo preview" />}
          <div>
            <p className="card-heading">{customization.brand.brandName || event.name}</p>
            <p className="card-copy">{customization.brand.tagline}</p>
            <p className="tiny-copy">{customization.brand.themeName || customization.themePreset} theme</p>
            <p className="tiny-copy">{customization.brand.companyName || customization.brand.organizerName}</p>
          </div>
        </div>
        <div className="wizard-preview-wheel" style={{ borderColor: customization.colors.primary, borderStyle: customization.wheel.borderStyle, borderWidth: `${customization.wheel.borderThickness}px` }}>
          <div className="wizard-preview-pointer" style={{ background: customization.wheel.pointerColor }}>{customization.wheel.pointerStyle}</div>
          <div className="wizard-preview-wheel-face" style={{ fontFamily: customization.wheel.fontStyle, fontSize: `${customization.wheel.fontSize}px`, color: customization.colors.text }}>
            {customization.wheel.style}
          </div>
        </div>
        <div className="wizard-preview-details">
          <div>
            <p className="card-subheading">Spin settings</p>
            <p className="card-copy">Mode: {customization.spin.mode}</p>
            <p className="card-copy">Duration: {customization.spin.duration === 'Custom' ? `${customization.spin.customSeconds}s` : customization.spin.duration}</p>
          </div>
          <div>
            <p className="card-subheading">Prize snapshot</p>
            {customization.prizes.slice(0, 5).map((prize) => (
              <div
                key={prize.id}
                className={`wizard-preview-prize ${prize.id <= 3 ? `wizard-preview-prize-rank-${prize.id}` : ''}`}
              >
                <span>{prize.name}</span>
                <strong>{prize.winnerCount} winner{prize.winnerCount === 1 ? '' : 's'}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderSection = () => {
    switch (activeSection) {
      case 'Branding': return renderBrandingSection();
      case 'Colors': return renderColorsSection();
      case 'Wheel': return renderWheelSection();
      case 'Spin': return renderSpinSection();
      case 'Prizes': return renderPrizesSection();
      case 'Winners': return renderWinnersSection();
      case 'Preview': return renderPreviewSection();
      default: return renderBrandingSection();
    }
  };

  return (
    <div className="dup-modal-backdrop" onClick={onClose}>
      <div className="dup-modal customization-wizard" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="dup-modal-close" onClick={onClose} aria-label="Close customization">×</button>
        <div className="dup-modal-scroll">
          <div className="wizard-top-bar">
            <div>
              <h2 className="dup-modal-title">Event Customization Setup</h2>
              <p className="dup-modal-copy">Configure branding, wheel style, prizes, and winner allocation before you publish.</p>
            </div>
            <div className="wizard-event-pill">Editing: {event.name}</div>
          </div>

          <div className="wizard-step-tabs">
            {availableSections.map((section) => (
              <button
                key={section}
                type="button"
                className={`wizard-step-pill${activeSection === section ? ' wizard-step-pill--active' : ''}`}
                onClick={() => setActiveSection(section)}
              >
                {section}
              </button>
            ))}
          </div>

          <div className="wizard-grid">
            <div className="wizard-main">
              {renderSection()}
              {message && <div className="warn-card" style={{ marginTop: '1rem' }}>{message}</div>}
            </div>
            <aside className="wizard-preview-panel">
              <p className="card-heading">Live Preview</p>
              <div className="soft-card wizard-preview-panel-card">
                {customization.brand.bannerUrl ? (
                  <div className="wizard-preview-banner-small" style={{ backgroundImage: `url(${customization.brand.bannerUrl})` }} />
                ) : (
                  <div className="wizard-preview-banner-small wizard-preview-banner--empty">Banner preview</div>
                )}
                <div className="wizard-preview-block" style={{ color: customization.colors.text }}>
                  {customization.brand.logoUrl && <img src={customization.brand.logoUrl} alt="Logo" className="wizard-preview-logo-small" />}
                  <p className="card-heading" style={{ color: customization.colors.primary }}>{customization.brand.brandName || event.name}</p>
                  <p className="card-copy">{customization.brand.tagline}</p>
                  <div className="wizard-preview-badges">
                    <span style={{ background: customization.colors.accent, color: '#fff' }}>Wheel: {customization.wheel.style}</span>
                    <span style={{ background: customization.colors.button, color: '#fff' }}>Spin: {customization.spin.duration}</span>
                  </div>
                  <div className="wizard-preview-prize-list">
                    {customization.prizes.slice(0, 3).map((prize) => (
                      <div key={prize.id} className="wizard-preview-prize-item" style={{ borderColor: customization.colors.secondary }}>
                        <span>{prize.name}</span>
                        <strong>{prize.winnerCount}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>

        <div className="dup-modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>Back</button>
          <button type="button" className="btn-ghost" onClick={saveCustomization}>Save Customization</button>
          <button type="button" className="btn-primary action-btn" onClick={() => setActiveSection('Preview')}>Preview Event</button>
          <button type="button" className="btn-primary action-btn" onClick={publishEvent}>Publish Event</button>
        </div>
      </div>
    </div>
  );
}
