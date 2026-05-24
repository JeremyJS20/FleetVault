import React from 'react';
import { FileUploader } from './FileUploader.js';

interface LicensePhotoCaptureProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  required?: boolean;
  onFileSelect?: (file: File | null) => void;
}

export const LicensePhotoCapture: React.FC<LicensePhotoCaptureProps> = (props) => (
  <FileUploader {...props} accept="image/*" showCamera />
);

export default LicensePhotoCapture;
