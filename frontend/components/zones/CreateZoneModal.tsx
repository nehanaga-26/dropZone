'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Zone, ZoneDurationPreset, CreateZoneInput } from '../../lib/types';
import * as dataApi from '../../lib/services/data';
import { ClockIcon, MapPinIcon, SparklesIcon, CheckIcon, AlertTriangleIcon } from '../ui/icons';
import { dropZoneService } from '../../lib/services/postService';

interface CreateZoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onZoneCreated: (newZone: Zone) => void;
}

export function CreateZoneModal({ isOpen, onClose, onZoneCreated }: CreateZoneModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState<string>('https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&auto=format&fit=crop&q=80');
  const [centerLatitude, setCenterLatitude] = useState('37.7749');
  const [centerLongitude, setCenterLongitude] = useState('-122.4194');
  const [radiusMeters, setRadiusMeters] = useState('250');
  const [durationPreset, setDurationPreset] = useState<ZoneDurationPreset>('12h');
  const [customValue, setCustomValue] = useState('6');
  const [customUnit, setCustomUnit] = useState<'minutes' | 'hours' | 'days'>('hours');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState(false);

  const [expiryPreview, setExpiryPreview] = useState<string>('');

  // Calculate live expiration preview inside useEffect for SSR/prerender safety
  useEffect(() => {
    let durationMs = 0;
    if (durationPreset === '1h') durationMs = 60 * 60 * 1000;
    else if (durationPreset === '12h') durationMs = 12 * 60 * 60 * 1000;
    else if (durationPreset === '3d') durationMs = 3 * 24 * 60 * 60 * 1000;
    else {
      const val = parseFloat(customValue) || 0;
      if (customUnit === 'minutes') durationMs = val * 60 * 1000;
      else if (customUnit === 'hours') durationMs = val * 60 * 60 * 1000;
      else durationMs = val * 24 * 60 * 60 * 1000;
    }

    if (durationMs <= 0) {
      setExpiryPreview('Invalid duration');
      return;
    }
    const expiresAt = new Date(Date.now() + durationMs);
    setExpiryPreview(`${expiresAt.toLocaleDateString()} at ${expiresAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
  }, [durationPreset, customValue, customUnit]);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setErrorMsg('Image file size must be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCoverImage(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const radius = parseInt(radiusMeters, 10);
    const lat = parseFloat(centerLatitude);
    const lng = parseFloat(centerLongitude);

    if (!name.trim()) {
      setErrorMsg('Zone name is required.');
      return;
    }

    if (isNaN(radius) || radius < 50 || radius > 5000) {
      setErrorMsg('Radius must be between 50 and 5,000 meters.');
      return;
    }

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setErrorMsg('Invalid coordinates provided.');
      return;
    }

    setIsSubmitting(true);
    try {
      const input: CreateZoneInput = {
        name: name.trim(),
        description: description.trim(),
        coverImage: coverImage || undefined,
        centerLatitude: lat,
        centerLongitude: lng,
        radiusMeters: radius,
        durationPreset,
        customDurationValue: durationPreset === 'custom' ? parseFloat(customValue) : undefined,
        customDurationUnit: durationPreset === 'custom' ? customUnit : undefined,
      };

      // Backend first (real DB zone); mock fallback keeps demo working offline.
      // Note: the backend stores name + description; radius/centre apply on the demo board.
      const newZone = await dataApi
        .createZone(name.trim(), description.trim())
        .catch(() => dropZoneService.createZone(input));
      setSuccessMsg(true);
      setTimeout(() => {
        onZoneCreated(newZone);
        onClose();
        setSuccessMsg(false);
        setName('');
        setDescription('');
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create zone.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Spatial Zone"
      subtitle="ESTABLISH GEOFENCED BOUNDARY // ACTIVE COMMUNITY HUB"
      maxWidth="lg"
    >
      {successMsg ? (
        <div className="py-12 text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 flex items-center justify-center animate-bounce">
            <CheckIcon size={28} />
          </div>
          <h3 className="text-lg font-bold text-[#172B4D]">Zone Created Successfully!</h3>
          <p className="text-xs text-[#71819A]">Initializing spatial perimeter and registering geofenced beacon...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              <AlertTriangleIcon size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Zone Name & Description */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#71819A] mb-1.5">
                Zone Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Science Quad Lawn, Hackathon Lab 402"
                maxLength={60}
                required
                className="w-full px-4 py-2.5 rounded-2xl bg-white border border-[#809DC4]/30 focus:border-[#248BFF] focus:ring-2 focus:ring-[#248BFF]/20 text-[#172B4D] text-sm placeholder:text-[#809DC4] outline-none transition"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#71819A]">
                  Description <span className="font-normal lowercase text-[10px]">(optional)</span>
                </label>
                <span className="text-[10px] font-mono text-[#71819A]">{description.length}/280</span>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is happening in this spatial zone? Who is it for?"
                maxLength={280}
                rows={2}
                className="w-full px-4 py-2.5 rounded-2xl bg-white border border-[#809DC4]/30 focus:border-[#248BFF] focus:ring-2 focus:ring-[#248BFF]/20 text-[#172B4D] text-sm placeholder:text-[#809DC4] outline-none transition resize-none"
              />
            </div>
          </div>

          {/* Cover Image with preview */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#71819A] mb-1.5">
              Cover Image Banner
            </label>
            <div className="flex items-center gap-4">
              <div className="w-24 h-14 rounded-xl border border-[#809DC4]/30 overflow-hidden bg-slate-100 shrink-0 relative">
                {coverImage ? (
                  <img src={coverImage} alt="Cover preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-[#71819A]">No image</div>
                )}
              </div>
              <div className="flex-1 space-y-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="text-xs text-[#71819A] file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border file:border-[#809DC4]/30 file:text-xs file:font-semibold file:bg-[#F0F4FA] file:text-[#172B4D] hover:file:bg-[#E2ECF8] cursor-pointer"
                />
                <p className="text-[10px] text-[#71819A]">Supports PNG, JPG, WebP under 2MB</p>
              </div>
            </div>
          </div>

          {/* Geolocation & Radius */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-[#F0F4FA]/80 border border-[#809DC4]/25">
            <div>
              <label className="block text-[11px] font-semibold text-[#172B4D] mb-1">
                Center Latitude
              </label>
              <input
                type="number"
                step="0.0001"
                value={centerLatitude}
                onChange={(e) => setCenterLatitude(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-white border border-[#809DC4]/30 text-xs font-mono text-[#172B4D] outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#172B4D] mb-1">
                Center Longitude
              </label>
              <input
                type="number"
                step="0.0001"
                value={centerLongitude}
                onChange={(e) => setCenterLongitude(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-white border border-[#809DC4]/30 text-xs font-mono text-[#172B4D] outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#172B4D] mb-1">
                Radius (Meters)
              </label>
              <input
                type="number"
                min="50"
                max="5000"
                step="10"
                value={radiusMeters}
                onChange={(e) => setRadiusMeters(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-white border border-[#809DC4]/30 text-xs font-mono text-[#172B4D] outline-none"
              />
              <span className="text-[9px] text-[#71819A]">Min: 50m • Max: 5,000m</span>
            </div>
          </div>

          {/* Duration Options */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#71819A] mb-2">
              Zone Duration Presets
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: '1h', label: '1 Hour', desc: 'Short meetup' },
                { id: '12h', label: '12 Hours', desc: 'Hackathon day' },
                { id: '3d', label: '3 Days', desc: 'Weekend event' },
                { id: 'custom', label: 'Custom', desc: 'Select duration' },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setDurationPreset(opt.id as ZoneDurationPreset)}
                  className={`p-2.5 rounded-2xl border text-left transition ${
                    durationPreset === opt.id
                      ? 'border-[#248BFF] bg-[#248BFF]/10 text-[#248BFF] shadow-sm'
                      : 'border-[#809DC4]/25 bg-white/70 text-[#172B4D] hover:bg-white hover:border-[#809DC4]/40'
                  }`}
                >
                  <div className="text-xs font-bold">{opt.label}</div>
                  <div className="text-[10px] text-[#71819A]">{opt.desc}</div>
                </button>
              ))}
            </div>

            {durationPreset === 'custom' && (
              <div className="flex items-center gap-2 mt-3 p-3 rounded-2xl bg-white border border-[#809DC4]/30">
                <input
                  type="number"
                  min="5"
                  max="365"
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  className="w-20 px-3 py-1.5 rounded-xl bg-[#F0F4FA] border border-[#809DC4]/30 text-xs font-mono font-bold text-[#172B4D] outline-none"
                />
                <select
                  value={customUnit}
                  onChange={(e) => setCustomUnit(e.target.value as any)}
                  className="px-3 py-1.5 rounded-xl bg-[#F0F4FA] border border-[#809DC4]/30 text-xs font-semibold text-[#172B4D] outline-none"
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                </select>
                <span className="text-xs text-[#71819A]">duration window</span>
              </div>
            )}

            {/* Expiry preview card */}
            <div className="mt-3 p-3 rounded-2xl bg-gradient-to-r from-[#248BFF]/8 to-[#8B78F6]/8 border border-[#248BFF]/20 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-[#172B4D]">
                <ClockIcon size={16} className="text-[#248BFF]" />
                <span className="font-medium">Estimated Expiration:</span>
              </div>
              <span className="text-xs font-mono font-bold text-[#248BFF]">{expiryPreview}</span>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#809DC4]/20">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#71819A] hover:bg-[#F0F4FA] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#248BFF] to-[#20C9F8] text-white text-xs font-bold shadow-md shadow-[#248BFF]/20 hover:opacity-95 transition flex items-center gap-2"
            >
              <SparklesIcon size={14} />
              <span>{isSubmitting ? 'Establishing Zone...' : 'Create Spatial Zone'}</span>
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
