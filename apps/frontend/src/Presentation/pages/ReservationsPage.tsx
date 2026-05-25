import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../Infrastructure/auth.context.js';
import { useRentalsList, useCreateRental, useRentalReturn, useRentalReturnEstimate } from '../../Infrastructure/hooks/useRentals.js';
import { useVehicles } from '../../Infrastructure/hooks/useCatalog.js';
import { useCustomers, useUpdateCustomer, useCustomerPaymentMethods, useDeleteCustomerPaymentMethod, useUpdateRental, useUpdateInspection, useFeeConfigs } from '../../Infrastructure/hooks/useCatalog.js';
import { useUploadImage, getImageProxyUrl } from '../../Infrastructure/hooks/useUploads.js';
import { formatCurrency } from '@rent-car/common';
import { StatusBadge } from '../components/ui/StatusBadge.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { FormField } from '../components/ui/FormField.js';
import { SignaturePad } from '../components/ui/SignaturePad.js';
import { LicensePhotoCapture } from '../components/ui/LicensePhotoCapture.js';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from '../../Infrastructure/stripe.js';
import { StripeCardForm } from '../components/ui/StripeCardForm.js';
import { Toast } from '../components/ui/Toast.js';
import { FileUploader } from '../components/ui/FileUploader.js';
import { 
  Calendar, Check, User, Sparkles, Play, Camera,
  CornerDownLeft, RefreshCw, AlertCircle, Trash2, X
} from 'lucide-react';

export const ReservationsPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const canCheckout = user?.role === 'AGENT' || user?.role === 'ADMINISTRATOR';

  // Filters state
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState(1);

  // Queries
  const { data: rentalsData, isLoading: isRentalsLoading, refetch } = useRentalsList({ status, page, limit: 20 });
  const rentals = rentalsData?.items || [];

  // Stepper Wizards State
  const [checkoutRental, setCheckoutRental] = useState<any | null>(null);
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [checkoutSignature, setCheckoutSignature] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Checkout driver fields (corporate employee)
  const [checkoutDriverName, setCheckoutDriverName] = useState('');
  const [checkoutDriverLicense, setCheckoutDriverLicense] = useState('');
  const [checkoutDriverLicenseCountry, setCheckoutDriverLicenseCountry] = useState('');
  const [checkoutDriverLicenseExpDate, setCheckoutDriverLicenseExpDate] = useState('');
  const [checkoutDriverLicensePhotoUrl, setCheckoutDriverLicensePhotoUrl] = useState('');
  const [pendingCheckoutDriverLicenseFile, setPendingCheckoutDriverLicenseFile] = useState<File | null>(null);

  // Counter edits for incomplete customer profiles
  const [counterNationalId, setCounterNationalId] = useState('');
  const [counterLicenseNumber, setCounterLicenseNumber] = useState('');
  const [counterLicenseCountry, setCounterLicenseCountry] = useState('');
  const [counterLicenseExpDate, setCounterLicenseExpDate] = useState('');
  const [counterLicensePhotoUrl, setCounterLicensePhotoUrl] = useState('');
  const [isUpdatingCustomer, setIsUpdatingCustomer] = useState(false);

  // Returns Wizard State
  const [returnRental, setReturnRental] = useState<any | null>(null);
  const [returnStep, setReturnStep] = useState(1);
  const [returnSignature, setReturnSignature] = useState<string | null>(null);
  const [estimateData, setEstimateData] = useState<any | null>(null);
  const [returnError, setReturnError] = useState<string | null>(null);

  // Walk-in booking state
  const [isWalkinOpen, setIsWalkinOpen] = useState(false);
  const [walkinCustomer, setWalkinCustomer] = useState('');
  const [walkinVehicle, setWalkinVehicle] = useState('');
  const [walkinStart, setWalkinStart] = useState('');
  const [walkinEnd, setWalkinEnd] = useState('');
  const [walkinRate, setWalkinRate] = useState(50);
  const [walkinCardToken, setWalkinCardToken] = useState<string | null>(null);
  const [walkinSignature, setWalkinSignature] = useState<string | null>(null);
  const [walkinError, setWalkinError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const [walkinUseNewCard, setWalkinUseNewCard] = useState(false);
  const [walkinStep, setWalkinStep] = useState(1);
  const [walkinPaymentMethod, setWalkinPaymentMethod] = useState<'STRIPE' | 'CASH'>('STRIPE');
  const [walkinPurchaseOrderNumber, setWalkinPurchaseOrderNumber] = useState('');

  // Walk-in driver fields (corporate employee)
  const [walkinDriverName, setWalkinDriverName] = useState('');
  const [walkinDriverLicense, setWalkinDriverLicense] = useState('');
  const [walkinDriverLicenseCountry, setWalkinDriverLicenseCountry] = useState('');
  const [walkinDriverLicenseExpDate, setWalkinDriverLicenseExpDate] = useState('');
  const [walkinDriverLicensePhotoUrl, setWalkinDriverLicensePhotoUrl] = useState('');
  const [pendingWalkinDriverLicenseFile, setPendingWalkinDriverLicenseFile] = useState<File | null>(null);

  // Walk-in inspection state
  const [walkinOdometer, setWalkinOdometer] = useState(0);
  const [walkinFuelLevel, setWalkinFuelLevel] = useState('FULL');
  const [walkinHasScratches, setWalkinHasScratches] = useState(false);
  const [walkinHasBrokenGlass, setWalkinHasBrokenGlass] = useState(false);
  const [walkinMissingSpareTire, setWalkinMissingSpareTire] = useState(false);
  const [walkinMissingJack, setWalkinMissingJack] = useState(false);
  const [walkinTireFL, setWalkinTireFL] = useState('GOOD');
  const [walkinTireFR, setWalkinTireFR] = useState('GOOD');
  const [walkinTireRL, setWalkinTireRL] = useState('GOOD');
  const [walkinTireRR, setWalkinTireRR] = useState('GOOD');
  const [walkinInspComments, setWalkinInspComments] = useState('');
  interface VehiclePhotoSlot { value: string; file: File | null }
  const [walkinPhotoSlots, setWalkinPhotoSlots] = useState<VehiclePhotoSlot[]>([]);
  const updateWalkinPhotoSlotValue = (index: number, value: string) => {
    setWalkinPhotoSlots(prev => prev.map((s, i) => i === index ? { ...s, value } : s));
  };
  const updateWalkinPhotoSlotFile = (index: number, file: File | null) => {
    setWalkinPhotoSlots(prev => prev.map((s, i) => i === index ? { ...s, file } : s));
  };
  const removeWalkinPhotoSlot = (index: number) => {
    const slot = walkinPhotoSlots[index];
    if (slot?.value?.startsWith('blob:')) URL.revokeObjectURL(slot.value);
    setWalkinPhotoSlots(prev => prev.filter((_, i) => i !== index));
  };
  const addWalkinPhotoSlot = () => {
    if (walkinPhotoSlots.length >= 5) return;
    setWalkinPhotoSlots(prev => [...prev, { value: '', file: null }]);
  };

  // Walk-in license form state
  const [walkinLicNationalId, setWalkinLicNationalId] = useState('');
  const [walkinLicNumber, setWalkinLicNumber] = useState('');
  const [walkinLicCountry, setWalkinLicCountry] = useState('');
  const [walkinLicExpDate, setWalkinLicExpDate] = useState('');
  const [walkinLicPhotoUrl, setWalkinLicPhotoUrl] = useState('');
  const [walkinPendingLicenseFile, setWalkinPendingLicenseFile] = useState<File | null>(null);
  const [walkinIsSavingProfile, setWalkinIsSavingProfile] = useState(false);

  // Walk-in saved cards queries
  const { data: walkinSavedCards, refetch: refetchWalkinSavedCards } = useCustomerPaymentMethods(walkinCustomer || undefined);
  const walkinCardsList = walkinSavedCards || [];
  const deleteWalkinCardMutation = useDeleteCustomerPaymentMethod(walkinCustomer || undefined);

  // Automatically sync selected card token when cards load
  useEffect(() => {
    if (isWalkinOpen) {
      if (walkinSavedCards && walkinSavedCards.length > 0) {
        setWalkinUseNewCard(false);
        setWalkinCardToken(walkinSavedCards[0].id);
      } else {
        setWalkinUseNewCard(true);
        setWalkinCardToken(null);
      }
    }
  }, [isWalkinOpen, walkinSavedCards]);

  const anyModalOpen = checkoutRental || returnRental || isWalkinOpen;
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeCheckout();
        closeReturn();
        closeWalkin();
      }
    };
    if (anyModalOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [anyModalOpen]);

  // Populate helper lists
  const { data: vehiclesData } = useVehicles({});
  const { data: customersData, refetch: refetchCustomers } = useCustomers({ excludeWithActiveRentals: true });
  const availableVehicles = vehiclesData?.items?.filter((v: any) => v.status === 'AVAILABLE') || [];
  const activeCustomers = customersData?.items?.filter((c: any) => c.status === 'ACTIVE') || [];

  // Mutations
  const createRentalMutation = useCreateRental();
  const returnRentalMutation = useRentalReturn();
  const estimateReturnMutation = useRentalReturnEstimate();
  const updateCustomerMutation = useUpdateCustomer();
  const updateRentalMutation = useUpdateRental();
  const updateInspectionMutation = useUpdateInspection();
  const uploadPhotoMutation = useUploadImage();
  const [pendingLicenseFile, setPendingLicenseFile] = useState<File | null>(null);
  const [isUploadingCounterPhoto, setIsUploadingCounterPhoto] = useState(false);
  const [pendingCheckoutSignatureFile, setPendingCheckoutSignatureFile] = useState<File | null>(null);
  const [pendingReturnSignatureFile, setPendingReturnSignatureFile] = useState<File | null>(null);
  const [pendingWalkinSignatureFile, setPendingWalkinSignatureFile] = useState<File | null>(null);

  // Modal close handlers with full state reset
  const closeCheckout = () => {
    if (checkoutSignature?.startsWith('blob:')) URL.revokeObjectURL(checkoutSignature);
    setCheckoutRental(null);
    setCheckoutStep(1);
    setCheckoutSignature(null);
    setPendingCheckoutSignatureFile(null);
    setCheckoutError(null);
    setCheckoutDriverName('');
    setCheckoutDriverLicense('');
    setCheckoutDriverLicenseCountry('');
    setCheckoutDriverLicenseExpDate('');
    setCheckoutDriverLicensePhotoUrl('');
    setPendingCheckoutDriverLicenseFile(null);
    createRentalMutation.reset();
  };

  const closeReturn = () => {
    if (returnSignature?.startsWith('blob:')) URL.revokeObjectURL(returnSignature);
    setReturnRental(null);
    setReturnStep(1);
    setReturnSignature(null);
    setPendingReturnSignatureFile(null);
    setEstimateData(null);
    setReturnError(null);
    returnRentalMutation.reset();
    estimateReturnMutation.reset();
  };

  const closeWalkin = () => {
    if (walkinSignature?.startsWith('blob:')) URL.revokeObjectURL(walkinSignature);
    setIsWalkinOpen(false);
    setWalkinCustomer('');
    setWalkinVehicle('');
    setWalkinStart('');
    setWalkinEnd('');
    setWalkinRate(50);
    setWalkinCardToken(null);
    setWalkinSignature(null);
    setPendingWalkinSignatureFile(null);
    setWalkinError(null);
    setWalkinStep(1);
    setWalkinPaymentMethod('STRIPE');
    setWalkinPurchaseOrderNumber('');
    setWalkinDriverName('');
    setWalkinDriverLicense('');
    setWalkinDriverLicenseCountry('');
    setWalkinDriverLicenseExpDate('');
    setWalkinDriverLicensePhotoUrl('');
    setPendingWalkinDriverLicenseFile(null);
    setWalkinLicNationalId('');
    setWalkinLicNumber('');
    setWalkinLicCountry('');
    setWalkinLicExpDate('');
    setWalkinLicPhotoUrl('');
    setWalkinPendingLicenseFile(null);
    setWalkinIsSavingProfile(false);
    createRentalMutation.reset();
  };

  const isCheckoutCustomerProfileIncomplete = 
    checkoutRental?.customer.type !== 'CORPORATE' && (
      !checkoutRental?.customer.nationalId || 
      !checkoutRental?.customer.licenseNumber || 
      !checkoutRental?.customer.licenseCountry || 
      !checkoutRental?.customer.licenseExpDate ||
      !checkoutRental?.customer.licensePhotoUrl
    );

  const selectedWalkinCustomer = customersData?.items?.find((c: any) => c.id === walkinCustomer);
  const isWalkinProfileIncomplete =
    !!selectedWalkinCustomer &&
    selectedWalkinCustomer.type !== 'CORPORATE' &&
    (!selectedWalkinCustomer.nationalId ||
     !selectedWalkinCustomer.licenseNumber ||
     !selectedWalkinCustomer.licenseCountry ||
     !selectedWalkinCustomer.licenseExpDate ||
     !selectedWalkinCustomer.licensePhotoUrl);

  const isWalkinCorporate = selectedWalkinCustomer?.type === 'CORPORATE';

  // Fee configs
  const { data: feeConfigs } = useFeeConfigs();

  const walkinOutstandingBalance = Number(selectedWalkinCustomer?.outstandingBalance || 0);
  const walkinRemainingCredit = (selectedWalkinCustomer?.creditLimit || 0) - walkinOutstandingBalance;

  const getWalkinDays = () => {
    if (!walkinStart || !walkinEnd) return 0;
    const start = new Date(walkinStart);
    const end = new Date(walkinEnd);
    const diff = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) || 1;
  };

  const walkinDays = getWalkinDays();
  const walkinRentCost = walkinRate * walkinDays;
  const securityDepositAmount = (feeConfigs as any[])?.find((f: any) => f.key === 'SECURITY_DEPOSIT')?.amount ?? 15000;
  const walkinUpfrontCash = walkinRentCost + securityDepositAmount;

  const handleStartCheckout = (rental: any) => {
    setCheckoutRental(rental);
    setCheckoutStep(1);
    setCheckoutSignature(null);
    setPendingCheckoutSignatureFile(null);
    setCheckoutError(null);

    setCounterNationalId(rental.customer.nationalId || '');
    setCounterLicenseNumber(rental.customer.licenseNumber || '');
    setCounterLicenseCountry(rental.customer.licenseCountry || '');
    setCounterLicenseExpDate(
      rental.customer.licenseExpDate 
        ? new Date(rental.customer.licenseExpDate).toISOString().split('T')[0] 
        : ''
    );
    setCounterLicensePhotoUrl(rental.customer.licensePhotoUrl || '');
  };

  const handleNextCheckoutStep = async () => {
    setCheckoutError(null);
    if (checkoutStep === 2) {
      if (checkoutRental?.customer.type === 'CORPORATE') {
        if (!checkoutDriverName.trim() || !checkoutDriverLicense.trim() || !checkoutDriverLicenseCountry.trim() || !checkoutDriverLicenseExpDate || !checkoutDriverLicensePhotoUrl) {
          setCheckoutError(t('customers.licensePhotoRequired', 'All driver fields and photo are required'));
          return;
        }
        if (pendingCheckoutDriverLicenseFile) {
          const uploadResult = await uploadPhotoMutation.mutateAsync({
            file: pendingCheckoutDriverLicenseFile,
            folder: 'licenses',
            entityType: 'rental',
            entityId: checkoutRental.id,
          });
          setCheckoutDriverLicensePhotoUrl(uploadResult.url);
          setPendingCheckoutDriverLicenseFile(null);
        }
        const expDate = new Date(checkoutDriverLicenseExpDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (expDate < today) {
          setCheckoutError(t('common.operationFailed'));
          return;
        }
        setCheckoutStep(checkoutStep + 1);
        return;
      }
      if (isCheckoutCustomerProfileIncomplete) {
        if (!counterNationalId || !counterLicenseNumber || !counterLicenseCountry || !counterLicenseExpDate || !counterLicensePhotoUrl) {
          setCheckoutError(t('customers.licensePhotoRequired', 'Driver\'s license photo is required'));
          return;
        }

        setIsUpdatingCustomer(true);
        try {
          let finalPhotoUrl = counterLicensePhotoUrl;
          if (pendingLicenseFile) {
            setIsUploadingCounterPhoto(true);
            try {
              const uploadResult = await uploadPhotoMutation.mutateAsync({ file: pendingLicenseFile, folder: 'licenses', entityType: 'customer', entityId: checkoutRental.customer.id });
              finalPhotoUrl = uploadResult.url;
              setPendingLicenseFile(null);
            } finally {
              setIsUploadingCounterPhoto(false);
            }
          }

          const updatedCustomer = await updateCustomerMutation.mutateAsync({
            id: checkoutRental.customer.id,
            data: {
              ...checkoutRental.customer,
              nationalId: counterNationalId,
              licenseNumber: counterLicenseNumber,
              licenseCountry: counterLicenseCountry,
              licenseExpDate: new Date(counterLicenseExpDate).toISOString(),
              licensePhotoUrl: finalPhotoUrl.startsWith('blob:') ? undefined : finalPhotoUrl,
            },
          });

          setCheckoutRental((prev: any) => ({
            ...prev,
            customer: {
              ...prev.customer,
              ...updatedCustomer,
              nationalId: counterNationalId,
              licenseNumber: counterLicenseNumber,
              licenseCountry: counterLicenseCountry,
              licenseExpDate: new Date(counterLicenseExpDate).toISOString(),
            },
          }));
        } catch (err: any) {
          setCheckoutError(err.message || t('common.operationFailed'));
          setIsUpdatingCustomer(false);
          return;
        } finally {
          setIsUpdatingCustomer(false);
        }
      }

      // Check license expiration (date-only comparison)
      const expDate = new Date(counterLicenseExpDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expDate < today) {
        setCheckoutError(t('common.operationFailed'));
        return;
      }
    }
    if (checkoutStep === 3) {
      if (!checkoutSignature) {
        setCheckoutError(t('common.operationFailed'));
        return;
      }
    }
    setCheckoutStep(checkoutStep + 1);
  };

  const handleConfirmCheckout = async () => {
    try {
      setCheckoutError(null);
      let finalSignatureUrl = checkoutSignature || '';
      if (pendingCheckoutSignatureFile) {
        const uploadResult = await uploadPhotoMutation.mutateAsync({
          file: pendingCheckoutSignatureFile,
          folder: 'signatures',
          entityType: 'rental',
          entityId: checkoutRental.id,
        });
        finalSignatureUrl = uploadResult.url;
        setPendingCheckoutSignatureFile(null);
      }
      await createRentalMutation.mutateAsync({
        rentalId: checkoutRental.id,
        signatureUrl: finalSignatureUrl,
        driverName: checkoutDriverName || undefined,
        driverLicenseNumber: checkoutDriverLicense || undefined,
        driverLicenseCountry: checkoutDriverLicenseCountry || undefined,
        driverLicenseExpDate: checkoutDriverLicenseExpDate || undefined,
        driverLicensePhotoUrl: checkoutDriverLicensePhotoUrl || undefined,
      });
      setCheckoutStep(4); // success
      refetch();
    } catch (err: any) {
      setCheckoutError(err.message || t('common.operationFailed'));
    }
  };

  // Return Processing
  const handleStartReturn = (rental: any) => {
    setReturnRental(rental);
    setReturnStep(1);
    setReturnSignature(null);
    setPendingReturnSignatureFile(null);
    setEstimateData(null);
    setReturnError(null);
  };

  const handleEstimateReturn = async () => {
    setReturnError(null);
    try {
      const data = await estimateReturnMutation.mutateAsync({
        id: returnRental.id,
        data: {
          actualReturnDate: new Date().toISOString()
        }
      });
      setEstimateData(data);
      setReturnStep(2); // Step 2: show breakdown & calculations
    } catch (err: any) {
      setReturnError(err.message || t('common.operationFailed'));
    }
  };

  const handleConfirmReturn = async () => {
    if (!returnSignature) {
      setReturnError(t('common.operationFailed'));
      return;
    }

    try {
      setReturnError(null);
      let finalSignatureUrl = returnSignature;
      if (pendingReturnSignatureFile) {
        const uploadResult = await uploadPhotoMutation.mutateAsync({
          file: pendingReturnSignatureFile,
          folder: 'signatures',
          entityType: 'rental',
          entityId: returnRental.id,
        });
        finalSignatureUrl = uploadResult.url;
        setPendingReturnSignatureFile(null);
      }
      const returnInsp = returnRental.inspections?.find((i: any) => i.type === 'RETURN');
      await returnRentalMutation.mutateAsync({
        id: returnRental.id,
        data: {
          actualReturnDate: new Date().toISOString(),
          returnSignatureUrl: finalSignatureUrl,
          comments: `Returned at odometer ${returnInsp?.odometer || '?'}.`
        }
      });
      setReturnStep(4); // success
      refetch();
    } catch (err: any) {
      setReturnError(err.message || t('common.operationFailed'));
    }
  };

  const handleNextWalkinStep = async () => {
    setWalkinError(null);
    if (walkinStep === 1) {
      if (!walkinCustomer || !walkinVehicle || !walkinStart || !walkinEnd || !walkinRate) {
        setWalkinError(t('common.fieldsRequired'));
        return;
      }
      const start = new Date(walkinStart);
      const end = new Date(walkinEnd);
      if (end < start) {
        setWalkinError(t('reservations.invalidDates', 'Return date must be after start date'));
        return;
      }
    }
    if (walkinStep === 2) {
      if (isWalkinCorporate) {
        if (!walkinDriverName.trim() || !walkinDriverLicense.trim() || !walkinDriverLicenseCountry.trim() || !walkinDriverLicenseExpDate || !walkinDriverLicensePhotoUrl) {
          setWalkinError(t('customers.licensePhotoRequired', 'All driver fields and photo are required'));
          return;
        }
        const expDate = new Date(walkinDriverLicenseExpDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (expDate < today) {
          setWalkinError(t('common.operationFailed'));
          return;
        }
        setWalkinStep(walkinStep + 1);
        return;
      }
      if (isWalkinProfileIncomplete) {
        if (!walkinLicNationalId || !walkinLicNumber || !walkinLicCountry || !walkinLicExpDate || !walkinLicPhotoUrl) {
          setWalkinError(t('customers.licensePhotoRequired', 'All license fields and photo are required'));
          return;
        }
        setWalkinIsSavingProfile(true);
        try {
          let finalPhotoUrl = walkinLicPhotoUrl;
          if (walkinPendingLicenseFile) {
            const uploadResult = await uploadPhotoMutation.mutateAsync({
              file: walkinPendingLicenseFile,
              folder: 'licenses',
              entityType: 'customer',
              entityId: walkinCustomer,
            });
            finalPhotoUrl = uploadResult.url;
            setWalkinPendingLicenseFile(null);
          }
          await updateCustomerMutation.mutateAsync({
            id: walkinCustomer,
            data: {
              nationalId: walkinLicNationalId,
              licenseNumber: walkinLicNumber,
              licenseCountry: walkinLicCountry,
              licenseExpDate: new Date(walkinLicExpDate).toISOString(),
              licensePhotoUrl: finalPhotoUrl.startsWith('blob:') ? undefined : finalPhotoUrl,
            },
          });
          refetchCustomers();
        } catch (err: any) {
          setWalkinError(err.message || t('common.operationFailed'));
          setWalkinIsSavingProfile(false);
          return;
        }
        setWalkinIsSavingProfile(false);
      }
    }
    if (walkinStep === 4) {
      if (isWalkinCorporate) {
        if (!walkinPurchaseOrderNumber.trim()) {
          setWalkinError(t('reservations.purchaseOrderRequired', 'Purchase Order number is required'));
          return;
        }
        if (walkinRentCost > walkinRemainingCredit) {
          setWalkinError(t('reservations.creditLimitExceeded', 'Corporate credit limit exceeded'));
          return;
        }
      } else if (walkinPaymentMethod === 'STRIPE') {
        if (!walkinCardToken) {
          setWalkinError(t('stripe.cardDetailsRequired', 'Please complete the card details'));
          return;
        }
      }
    }
    setWalkinStep(walkinStep + 1);
  };

  // Direct Walkin counter Booking
  const handleCreateWalkin = async () => {
    const isCcRequired = !isWalkinCorporate && walkinPaymentMethod === 'STRIPE';
    if (!walkinCustomer || !walkinVehicle || !walkinStart || !walkinEnd || (isCcRequired && !walkinCardToken) || !walkinSignature) {
      setWalkinError(t('common.fieldsRequired'));
      return;
    }

    try {
      setWalkinError(null);

      // 1. Create rental first (inspection photos + signature uploaded after)
      const created = await createRentalMutation.mutateAsync({
        customerId: walkinCustomer,
        vehicleId: walkinVehicle,
        rentalDate: new Date(walkinStart).toISOString(),
        scheduledReturnDate: new Date(walkinEnd).toISOString(),
        pricePerDay: Number(walkinRate),
        checkoutOdometer: Number(walkinOdometer),
        checkoutFuelLevel: walkinFuelLevel,
        stripePaymentMethodId: (isWalkinCorporate || walkinPaymentMethod === 'CASH') ? null : walkinCardToken,
        paymentMethod: isWalkinCorporate ? null : walkinPaymentMethod,
        purchaseOrderNumber: isWalkinCorporate ? walkinPurchaseOrderNumber : null,
        driverName: walkinDriverName || undefined,
        driverLicenseNumber: walkinDriverLicense || undefined,
        driverLicenseCountry: walkinDriverLicenseCountry || undefined,
        driverLicenseExpDate: walkinDriverLicenseExpDate || undefined,
        driverLicensePhotoUrl: isWalkinCorporate ? undefined : (walkinDriverLicensePhotoUrl || undefined),
        hasScratches: walkinHasScratches,
        hasBrokenGlass: walkinHasBrokenGlass,
        missingSpareTire: walkinMissingSpareTire,
        missingJack: walkinMissingJack,
        tireConditionFrontLeft: walkinTireFL,
        tireConditionFrontRight: walkinTireFR,
        tireConditionRearLeft: walkinTireRL,
        tireConditionRearRight: walkinTireRR,
        inspectionComments: walkinInspComments || null,
      });

      const rentalId = created.rental?.id || created.id;
      const inspectionId = created.inspection?.id;

      // 2. Upload signature with real rental ID
      if (pendingWalkinSignatureFile) {
        const uploadResult = await uploadPhotoMutation.mutateAsync({
          file: pendingWalkinSignatureFile,
          folder: 'signatures',
          entityType: 'rental',
          entityId: rentalId,
        });
        setPendingWalkinSignatureFile(null);

        await updateRentalMutation.mutateAsync({
          id: rentalId,
          data: { signatureUrl: uploadResult.url },
        });
      }

      // 3. Upload driver license photo for corporate walk-in with real rental ID
      if (pendingWalkinDriverLicenseFile) {
        const uploadResult = await uploadPhotoMutation.mutateAsync({
          file: pendingWalkinDriverLicenseFile,
          folder: 'licenses',
          entityType: 'rental',
          entityId: rentalId,
        });
        setPendingWalkinDriverLicenseFile(null);
        setWalkinDriverLicensePhotoUrl(uploadResult.url);
        await updateRentalMutation.mutateAsync({
          id: rentalId,
          data: { driverLicensePhotoUrl: uploadResult.url },
        });
      }

      // 4. Upload inspection photos with real rental ID
      const uploadedPhotoUrls: string[] = [];
      for (const slot of walkinPhotoSlots) {
        if (slot.file) {
          try {
            const result = await uploadPhotoMutation.mutateAsync({ file: slot.file, folder: 'inspections', entityType: 'rental', entityId: rentalId });
            uploadedPhotoUrls.push(result.url);
          } catch { /* skip failed uploads */ }
        } else if (slot.value) {
          uploadedPhotoUrls.push(slot.value);
        }
      }

      if (uploadedPhotoUrls.length > 0 && inspectionId) {
        await updateInspectionMutation.mutateAsync({
          id: inspectionId,
          data: { photoUrls: uploadedPhotoUrls },
        });
      }

      setWalkinStep(6); // success screen
      refetch();
    } catch (err: any) {
      setWalkinError(err.message || t('common.operationFailed'));
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-fg-main uppercase">
            {t('reservations.title')}
          </h2>
          <p className="text-xs text-fg-secondary mt-1">
            {t('reservations.subtitle')}
          </p>
        </div>

        {canCheckout && (
          <Button onClick={() => setIsWalkinOpen(true)} className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            {t('reservations.walkinBooking')}
          </Button>
        )}
      </div>

      {/* Filters Toolbar */}
      <div className="p-4 rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => { setStatus(''); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              status === '' ? 'bg-accent-primary text-white' : 'text-fg-secondary bg-bg-inset border border-border-surface/20'
            }`}
          >
            {t('reservations.allContracts')}
          </button>
          <button
            onClick={() => { setStatus('PENDING'); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              status === 'PENDING' ? 'bg-accent-primary text-white' : 'text-fg-secondary bg-bg-inset border border-border-surface/20'
            }`}
          >
            {t('reservations.pendingReservations')}
          </button>
          <button
            onClick={() => { setStatus('ACTIVE'); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              status === 'ACTIVE' ? 'bg-accent-primary text-white' : 'text-fg-secondary bg-bg-inset border border-border-surface/20'
            }`}
          >
            {t('reservations.activeRentals')}
          </button>
          <button
            onClick={() => { setStatus('COMPLETED'); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              status === 'COMPLETED' ? 'bg-accent-primary text-white' : 'text-fg-secondary bg-bg-inset border border-border-surface/20'
            }`}
          >
            {t('reservations.completed')}
          </button>
        </div>

        <button
          onClick={() => refetch()}
          className="p-2 rounded-lg bg-bg-inset border border-border-surface/30 text-fg-secondary hover:text-fg-main cursor-pointer"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Reservations Listings */}
      {isRentalsLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-accent-primary/20 border-t-accent-primary animate-spin" />
          <span className="text-xs text-fg-tertiary font-bold tracking-wider">{t('reservations.loading')}</span>
        </div>
      ) : rentals.length === 0 ? (
        <div className="text-center py-20 p-6 rounded-2xl border border-dashed border-border-surface/40 bg-bg-surface/10">
          <p className="text-sm font-bold text-fg-secondary">{t('reservations.noContracts')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {rentals.map((r: any) => (
            <div key={r.id} className="p-5 rounded-2xl border border-border-surface/30 bg-bg-card/45 backdrop-blur-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-border-surface transition-all">
              
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-bg-inset border border-border-surface/40 p-1 flex items-center justify-center shrink-0">
                  <img
                    src={getImageProxyUrl(r.vehicle.imageUrl || 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=400')}
                    alt={r.vehicle.model.name}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-fg-tertiary font-bold leading-none">#{r.id.substring(0, 8)}</span>
                    <h3 className="text-sm font-extrabold text-fg-main uppercase">
                      {r.vehicle.brand.name} {r.vehicle.model.name}
                    </h3>
                    <StatusBadge status={r.status} />
                    {r.status === 'PENDING' && !r.inspections?.some((i: any) => i.type === 'PICKUP') && (
                      <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded-full">Insp. Required</span>
                    )}
                    {r.status === 'PENDING' && r.inspections?.some((i: any) => i.type === 'PICKUP') && (
                      <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-full">Insp. Done</span>
                    )}
                    {r.status === 'ACTIVE' && !r.inspections?.some((i: any) => i.type === 'RETURN') && (
                      <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded-full">Return Insp. Pending</span>
                    )}
                    {r.status === 'ACTIVE' && r.inspections?.some((i: any) => i.type === 'RETURN') && (
                      <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-full">Return Insp. Done</span>
                    )}
                  </div>
                  <p className="text-xs text-fg-tertiary mt-1.5 flex items-center gap-1 font-semibold uppercase">
                    <User className="w-3.5 h-3.5 text-accent-primary" />
                    {t('reservations.customer')} <span className="text-fg-secondary font-bold">{r.customer.name}</span>
                  </p>
                  {r.checkoutEmployee && (
                    <p className="text-xs text-fg-tertiary mt-1 flex items-center gap-1 font-semibold uppercase">
                      <User className="w-3.5 h-3.5 text-accent-primary" />
                      {t('reservations.employee')} <span className="text-fg-secondary font-bold">{r.checkoutEmployee.name}</span>
                    </p>
                  )}
                  {r.returnEmployee && (
                    <p className="text-xs text-fg-tertiary mt-1 flex items-center gap-1 font-semibold uppercase">
                      <User className="w-3.5 h-3.5 text-accent-primary" />
                      {t('reservations.returnEmployee')} <span className="text-fg-secondary font-bold">{r.returnEmployee.name}</span>
                    </p>
                  )}
                  <p className="text-xs text-fg-tertiary mt-1.5 flex items-center gap-1 font-semibold uppercase">
                    <Calendar className="w-3.5 h-3.5 text-accent-primary" />
                    {new Date(r.rentalDate).toLocaleDateString()} — {new Date(r.scheduledReturnDate).toLocaleDateString()}
                  </p>
                  {r.customer?.type === 'CORPORATE' && r.customer.outstandingBalance !== undefined && (
                    <p className="text-[10px] text-accent-primary mt-1.5 flex items-center gap-1 font-bold">
                      <span className="uppercase tracking-wider">{t('reservations.outstandingBalance', 'Outstanding')}:</span>
                      <span className="font-mono">{formatCurrency(r.customer.outstandingBalance)}</span>
                      <span className="text-fg-tertiary mx-0.5">/</span>
                      <span className="uppercase tracking-wider text-fg-tertiary">{t('customers.creditLimit', 'Limit')}:</span>
                      <span className="font-mono text-fg-tertiary">{formatCurrency(r.customer.creditLimit || 0)}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                {r.status === 'PENDING' && canCheckout && (
                  <Button
                    onClick={() => handleStartCheckout(r)}
                    disabled={!r.inspections?.some((i: any) => i.type === 'PICKUP')}
                    className="!h-8 text-xs uppercase font-bold tracking-widest px-4 rounded-lg flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5" />
                    {r.inspections?.some((i: any) => i.type === 'PICKUP') ? t('reservations.checkout') : t('reservations.inspectionRequired')}
                  </Button>
                )}

                {r.status === 'ACTIVE' && (
                  <Button
                    onClick={() => handleStartReturn(r)}
                    disabled={!r.inspections?.some((i: any) => i.type === 'RETURN')}
                    className="!h-8 text-xs uppercase font-bold tracking-widest px-4 rounded-lg bg-emerald-500 border border-emerald-500 hover:bg-emerald-600 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <CornerDownLeft className="w-3.5 h-3.5" />
                    {r.inspections?.some((i: any) => i.type === 'RETURN') ? t('reservations.returnVehicle') : t('reservations.inspectionRequired')}
                  </Button>
                )}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {rentalsData && rentalsData.pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-bg-inset border border-border-surface/30 text-fg-secondary hover:text-fg-main transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            ← {t('common.previous', 'Prev')}
          </button>
          <span className="text-xs text-fg-tertiary font-semibold px-3">
            {page} / {rentalsData.pages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(rentalsData.pages, p + 1))}
            disabled={page >= rentalsData.pages}
            className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-bg-inset border border-border-surface/30 text-fg-secondary hover:text-fg-main transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            {t('common.next')} →
          </button>
        </div>
      )}

      {/* 5-STEP RENTAL CHECKOUT STEPPER DIALOG */}
      {checkoutRental && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in" onClick={closeCheckout}>
          <div className="bg-bg-card border border-border-surface max-w-lg w-full rounded-3xl p-6 shadow-2xl backdrop-blur-2xl animate-slide-up relative space-y-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            
            <button
              onClick={closeCheckout}
              className="absolute top-5 right-5 text-fg-tertiary hover:text-fg-main cursor-pointer z-10"
            >
              ✕
            </button>

            <div>
              <span className="text-[9px] font-bold text-accent-primary uppercase tracking-widest block">{t('reservations.checkoutContract')}</span>
              <h2 className="text-lg font-extrabold text-fg-main mt-1 uppercase">
                {checkoutStep === 1 && t('reservations.stepVerify')}
                {checkoutStep === 2 && (checkoutRental?.customer.type === 'CORPORATE'
                  ? t('reservations.stepAuthorizedDriver', 'Authorized Driver')
                  : t('reservations.stepLicense'))}
                {checkoutStep === 3 && t('reservations.stepSignature')}
                {checkoutStep === 4 && t('reservations.stepActivated')}
              </h2>
            </div>

            {/* Stepper Dots */}
            {checkoutStep !== 4 && (
              <div className="flex gap-1.5">
                {[1, 2, 3].map(idx => (
                  <div key={idx} className={`h-1.5 flex-1 rounded-full ${checkoutStep >= idx ? 'bg-accent-primary' : 'bg-white/10'}`} />
                ))}
              </div>
            )}

            {checkoutError && (
              <div className="p-3 rounded-xl bg-accent-error/15 border border-accent-error/20 text-accent-error text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {checkoutError}
              </div>
            )}

            {/* Step 1: Details */}
            {checkoutStep === 1 && (
              <div className="space-y-4">
                <table className="w-full text-xs text-left border-collapse">
                  <tbody>
                    <tr className="border-b border-white/5"><td className="py-2 text-fg-tertiary">{t('reservations.customerName')}</td><td className="py-2 text-fg-main font-bold">{checkoutRental.customer.name}</td></tr>
                    <tr className="border-b border-white/5"><td className="py-2 text-fg-tertiary">{t('reservations.vehicleAssigned')}</td><td className="py-2 text-fg-main font-bold">{checkoutRental.vehicle.brand.name} {checkoutRental.vehicle.model.name}</td></tr>
                    <tr className="border-b border-white/5"><td className="py-2 text-fg-tertiary">{t('reservations.plateNumber')}</td><td className="py-2 text-fg-main font-bold font-mono">{checkoutRental.vehicle.plateNumber}</td></tr>
                    <tr className="border-b border-white/5"><td className="py-2 text-fg-tertiary">{t('reservations.rentalDates')}</td><td className="py-2 text-fg-main">{new Date(checkoutRental.rentalDate).toLocaleDateString()} — {new Date(checkoutRental.scheduledReturnDate).toLocaleDateString()}</td></tr>
                  </tbody>
                </table>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="secondary" onClick={closeCheckout}>{t('reservations.cancel')}</Button>
                  <Button onClick={() => setCheckoutStep(2)}>
                    {t('reservations.nextVerify')}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: License check / Authorized Driver */}
            {checkoutStep === 2 && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-bg-inset border border-border-surface/40 space-y-3">
                  <span className="text-xs text-fg-tertiary font-bold block uppercase leading-none">
                    {checkoutRental?.customer.type === 'CORPORATE'
                      ? t('reservations.stepAuthorizedDriver', 'Authorized Driver')
                      : (isCheckoutCustomerProfileIncomplete ? t('reservations.completeProfile') : t('reservations.registeredCreds'))}
                  </span>

                  {checkoutRental?.customer.type === 'CORPORATE' ? (
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg border border-accent-primary/20 bg-accent-primary/5 text-xs text-fg-secondary">
                        {t('reservations.driverInfoPrompt', 'Verify the employee\'s authorization letter and enter their details below.')}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <FormField label={t('reservations.driverName', "Driver's Full Name")} required>
                          <Input
                            type="text"
                            placeholder={t('reservations.driverNamePlaceholder', 'e.g. Juan Pérez')}
                            value={checkoutDriverName}
                            onChange={(e) => setCheckoutDriverName(e.target.value)}
                            className="!h-9 rounded-lg"
                          />
                        </FormField>

                        <FormField label={t('reservations.driverLicenseNumber', "Driver's License Number")} required>
                          <Input
                            type="text"
                            placeholder={t('reservations.driverLicensePlaceholder', 'e.g. DL-12345')}
                            value={checkoutDriverLicense}
                            onChange={(e) => setCheckoutDriverLicense(e.target.value)}
                            className="!h-9 rounded-lg"
                          />
                        </FormField>

                        <FormField label={t('reservations.driverLicenseCountry', "License Country")} required>
                          <Input
                            type="text"
                            placeholder={t('customers.placeholderCountry')}
                            value={checkoutDriverLicenseCountry}
                            onChange={(e) => setCheckoutDriverLicenseCountry(e.target.value)}
                            className="!h-9 rounded-lg"
                          />
                        </FormField>

                        <FormField label={t('reservations.driverLicenseExpiry', "License Expiry")} required>
                          <Input
                            type="date"
                            value={checkoutDriverLicenseExpDate}
                            onChange={(e) => setCheckoutDriverLicenseExpDate(e.target.value)}
                            className="!h-9 rounded-lg"
                          />
                        </FormField>
                      </div>

                      <div className="pt-3 border-t border-border-surface/15">
                        <LicensePhotoCapture
                          value={checkoutDriverLicensePhotoUrl}
                          onChange={setCheckoutDriverLicensePhotoUrl}
                          onFileSelect={setPendingCheckoutDriverLicenseFile}
                          required
                          label={t('customers.licensePhoto', "Driver's License Photo")}
                        />
                      </div>
                    </div>
                  ) : isCheckoutCustomerProfileIncomplete ? (
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-xs text-amber-200">
                        {t('reservations.profileMissing')}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <FormField label={t('reservations.nationalId')} required>
                          <Input
                            type="text"
                            placeholder={t('customers.placeholderId')}
                            value={counterNationalId}
                            onChange={(e) => setCounterNationalId(e.target.value)}
                            className="!h-9 rounded-lg"
                          />
                        </FormField>

                        <FormField label={t('reservations.driversLicense')} required>
                          <Input
                            type="text"
                            placeholder={t('customers.placeholderLicense')}
                            value={counterLicenseNumber}
                            onChange={(e) => setCounterLicenseNumber(e.target.value)}
                            className="!h-9 rounded-lg"
                          />
                        </FormField>

                        <FormField label={t('reservations.licenseCountry')} required>
                          <Input
                            type="text"
                            placeholder={t('customers.placeholderCountry')}
                            value={counterLicenseCountry}
                            onChange={(e) => setCounterLicenseCountry(e.target.value)}
                            className="!h-9 rounded-lg"
                          />
                        </FormField>

                        <FormField label={t('reservations.licenseExpiry')} required>
                          <Input
                            type="date"
                            value={counterLicenseExpDate}
                            onChange={(e) => setCounterLicenseExpDate(e.target.value)}
                            className="!h-9 rounded-lg"
                          />
                        </FormField>
                      </div>

                      <div className="mt-3 pt-3 border-t border-border-surface/15">
                        <LicensePhotoCapture
                          value={counterLicensePhotoUrl}
                          onChange={setCounterLicensePhotoUrl}
                          onFileSelect={setPendingLicenseFile}
                          required={true}
                          label={t('customers.licensePhoto', 'Driver\'s License Photo')}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-fg-tertiary block text-xs">{t('reservations.licenseNumberLabel')}</span>
                          <span className="text-fg-main font-bold font-mono">{checkoutRental.customer.licenseNumber}</span>
                        </div>
                        <div>
                          <span className="text-fg-tertiary block text-xs">{t('reservations.expirationDate')}</span>
                          <span className={`font-bold ${new Date(checkoutRental.customer.licenseExpDate) < new Date() ? 'text-accent-error' : 'text-emerald-500'}`}>
                            {new Date(checkoutRental.customer.licenseExpDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-fg-tertiary block text-xs">{t('reservations.licenseCountryLabel')}</span>
                          <span className="text-fg-main font-bold">{checkoutRental.customer.licenseCountry || '—'}</span>
                        </div>
                        <div>
                          <span className="text-fg-tertiary block text-xs">{t('reservations.nationalIdLabel')}</span>
                          <span className="text-fg-main font-bold">{checkoutRental.customer.nationalId}</span>
                        </div>
                        <div>
                          <span className="text-fg-tertiary block text-xs">{t('reservations.profileStatus')}</span>
                          <span className="text-emerald-500 font-bold uppercase">{checkoutRental.customer.status}</span>
                        </div>
                      </div>

                      {checkoutRental.customer.licensePhotoUrl && (
                        <div className="mt-3 border-t border-border-surface/15 pt-3">
                          <span className="text-fg-tertiary block text-xs mb-1.5 uppercase font-bold tracking-wider">{t('customers.licensePhoto', 'Driver\'s License Photo')}</span>
                          <div className="w-full aspect-[16/10] max-h-48 rounded-xl border border-border-surface/20 overflow-hidden bg-bg-inset">
                            <img
                              src={getImageProxyUrl(checkoutRental.customer.licensePhotoUrl)}
                              alt="License Record"
                              className="w-full h-full object-contain"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="secondary" onClick={() => setCheckoutStep(1)}>{t('reservations.back')}</Button>
                  <Button onClick={handleNextCheckoutStep} isLoading={isUpdatingCustomer || isUploadingCounterPhoto}>
                    {isCheckoutCustomerProfileIncomplete ? t('reservations.saveContinue') : t('reservations.nextSignature')}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Draw Hand Signature */}
            {checkoutStep === 3 && (
              <div className="space-y-4">
                <span className="text-xs font-semibold text-fg-secondary block">{t('reservations.signaturePrompt')}</span>
                <SignaturePad onChange={setCheckoutSignature} onFileSelect={setPendingCheckoutSignatureFile} />

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="secondary" onClick={() => setCheckoutStep(2)}>{t('reservations.back')}</Button>
                  <Button
                    onClick={handleConfirmCheckout}
                    isLoading={uploadPhotoMutation.isPending || createRentalMutation.isPending}
                    disabled={!checkoutSignature}
                  >
                    {t('reservations.authorizeCheckout')}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Success screen */}
            {checkoutStep === 4 && (
              <div className="flex flex-col items-center justify-center text-center py-6 space-y-4 animate-scale-up">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center text-emerald-500">
                  <Check className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-extrabold text-fg-main uppercase tracking-wider">{t('reservations.checkoutComplete')}</h3>
                  <p className="text-xs text-fg-secondary max-w-sm">
                    {t('reservations.checkoutDesc')}
                  </p>
                </div>

                <div className="pt-4 w-full">
                  <Button className="w-full" onClick={closeCheckout}>
                    {t('reservations.dismiss')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RETURN DIALOG OVERLAY */}
      {returnRental && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in" onClick={closeReturn}>
          <div className="bg-bg-card border border-border-surface max-w-lg w-full rounded-3xl p-6 shadow-2xl backdrop-blur-2xl animate-slide-up relative space-y-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>

            <button onClick={closeReturn} className="absolute top-5 right-5 text-fg-tertiary hover:text-fg-main cursor-pointer z-10">✕</button>

            <div>
              <span className="text-[9px] font-bold text-accent-primary uppercase tracking-widest block">{t('reservations.returnDesk')}</span>
              <h2 className="text-lg font-extrabold text-fg-main mt-1 uppercase">
                {returnStep === 1 && t('reservations.stepReturnParams')}
                {returnStep === 2 && t('reservations.stepPenalty')}
                {returnStep === 4 && t('reservations.stepFinalized')}
              </h2>
            </div>

            {returnStep !== 4 && (
              <div className="flex gap-1.5">
                {[1, 2].map(idx => (
                  <div key={idx} className={`h-1.5 flex-1 rounded-full ${returnStep >= idx ? 'bg-accent-primary' : 'bg-white/10'}`} />
                ))}
              </div>
            )}

            {returnError && (
              <div className="p-3 rounded-xl bg-accent-error/15 border border-accent-error/20 text-accent-error text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {returnError}
              </div>
            )}

            {/* Step 1: Check-in Parameters (read-only from RETURN inspection) */}
            {returnStep === 1 && (() => {
              const returnInsp = returnRental.inspections?.find((i: any) => i.type === 'RETURN');
              const tireDmg = [returnInsp?.tireConditionFrontLeft, returnInsp?.tireConditionFrontRight, returnInsp?.tireConditionRearLeft, returnInsp?.tireConditionRearRight]
                .filter((t: string) => t === 'DAMAGED' || t === 'MISSING').length;
              return (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-bg-inset border border-border-surface/40 space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-fg-tertiary">{t('reservations.returnOdometer')}</span>
                    <span className="font-bold font-mono text-fg-main">{returnInsp?.odometer || '—'} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-fg-tertiary">{t('reservations.returnFuel')}</span>
                    <span className="font-bold text-fg-main">{returnInsp?.fuelGaugeLevel || '—'}</span>
                  </div>
                  <div className="border-t border-border-surface/15 pt-2">
                    <span className="text-fg-tertiary block mb-1.5">{t('reservations.inspectDamage')}</span>
                    <div className="flex flex-wrap gap-3">
                      <span className={`font-semibold ${returnInsp?.hasBrokenGlass ? 'text-accent-error' : 'text-emerald-500'}`}>
                        {returnInsp?.hasBrokenGlass ? '⚠ ' : '✓ '}{t('reservations.brokenGlass')}
                      </span>
                      <span className={`font-semibold ${returnInsp?.hasScratches ? 'text-accent-error' : 'text-emerald-500'}`}>
                        {returnInsp?.hasScratches ? '⚠ ' : '✓ '}{t('reservations.newScratches')}
                      </span>
                      <span className={`font-semibold ${tireDmg > 0 ? 'text-accent-error' : 'text-emerald-500'}`}>
                        {tireDmg > 0 ? `⚠ ${tireDmg} ` : '✓ '}{t('reservations.damagedTires')}
                      </span>
                    </div>
                  </div>
                  {returnInsp?.comments && (
                    <div className="border-t border-border-surface/15 pt-2">
                      <span className="text-fg-tertiary block">{t('inspections.comments')}:</span>
                      <span className="text-fg-main font-semibold">{returnInsp.comments}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="secondary" onClick={closeReturn}>{t('common.cancel')}</Button>
                  <Button onClick={handleEstimateReturn} isLoading={estimateReturnMutation.isPending}>
                    {t('reservations.estimatePenalty')}
                  </Button>
                </div>
              </div>
              );
            })()}

            {/* Step 2: Penalty Breakdown + Signature */}
            {returnStep === 2 && estimateData && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-bg-inset border border-border-surface/40 space-y-2 text-xs">
                  <div className="flex justify-between py-1">
                    <span className="text-fg-tertiary">{t('reservations.baseCost')}</span>
                    <span className="font-bold font-mono text-fg-main">RD${estimateData.baseCost?.toFixed(2)}</span>
                  </div>
                  {estimateData.lateFee > 0 && (
                    <div className="flex justify-between py-1">
                      <span className="text-fg-tertiary">{t('reservations.lateFee', { hours: estimateData.lateHours })}</span>
                      <span className="font-bold font-mono text-accent-error">+RD${estimateData.lateFee?.toFixed(2)}</span>
                    </div>
                  )}
                  {estimateData.fuelFee > 0 && (
                    <div className="flex justify-between py-1">
                      <span className="text-fg-tertiary">{t('reservations.refuelPenalty', { count: estimateData.fuelDifference })}</span>
                      <span className="font-bold font-mono text-accent-error">+RD${estimateData.fuelFee?.toFixed(2)}</span>
                    </div>
                  )}
                  {estimateData.totalDamageFee > 0 && (
                    <div className="flex justify-between py-1">
                      <span className="text-fg-tertiary">{t('reservations.damagePenalty')}</span>
                      <span className="font-bold font-mono text-accent-error">+RD${estimateData.totalDamageFee?.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-border-surface/15 pt-2 mt-2 flex justify-between">
                    <span className="text-sm font-extrabold text-fg-main">{t('reservations.finalCost')}</span>
                    <span className="text-sm font-extrabold font-mono text-fg-main">RD${estimateData.totalFinalCost?.toFixed(2)}</span>
                  </div>
                </div>

                {/* Cash reconciliation / Corporate Invoicing instructions */}
                {(() => {
                  const isCashRental = returnRental?.transactions?.some((t: any) => t.type === 'CASH');
                  const isCorporateRental = returnRental?.customer?.type === 'CORPORATE';
                  if (isCorporateRental) {
                    return (
                      <div className="p-3.5 rounded-xl border border-accent-primary/20 bg-accent-primary/5 text-fg-secondary text-xs space-y-1 animate-fade-in">
                        <span className="font-bold text-fg-primary block">
                          {t('reservations.corporateInvoiceTitle', 'Corporate Invoicing')}
                        </span>
                        <p className="leading-normal">
                          {t('reservations.corporateInvoiceDesc', 'Bill PO {{poNumber}} for {{amount}}.', {
                            poNumber: returnRental.purchaseOrderNumber || 'N/A',
                            amount: formatCurrency(estimateData.totalFinalCost ?? 0)
                          })}
                        </p>
                      </div>
                    );
                  }
                  if (isCashRental) {
                    const cashTransaction = returnRental?.transactions?.find((t: any) => t.type === 'CASH');
                    const initialPaidCash = cashTransaction?.amount ?? 0;
                    const diff = initialPaidCash - (estimateData.totalFinalCost ?? 0);
                    const isRefund = diff >= 0;
                    return (
                      <div className={`p-3.5 rounded-xl border text-fg-secondary text-xs space-y-2 animate-fade-in ${
                        isRefund
                          ? 'border-emerald-500/20 bg-emerald-500/5'
                          : 'border-accent-error/20 bg-accent-error/15'
                      }`}>
                        <span className={`font-bold block ${isRefund ? 'text-emerald-400' : 'text-accent-error'}`}>
                          {t('reservations.cashReconciliationTitle', 'Cash Reconciliation')}
                        </span>
                        <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold">
                          <div>
                            <span className="text-fg-tertiary block text-[9px] uppercase">{t('reservations.initialCashPaid', 'Initial Paid (Rent+Deposit)')}</span>
                            <span className="text-fg-main font-mono">{formatCurrency(initialPaidCash)}</span>
                          </div>
                          <div>
                            <span className="text-fg-tertiary block text-[9px] uppercase">{t('reservations.actualFinalCost', 'Actual Cost')}</span>
                            <span className="text-fg-main font-mono">{formatCurrency(estimateData.totalFinalCost ?? 0)}</span>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-border-surface/10">
                          {isRefund ? (
                            <p className="text-emerald-400 font-bold leading-normal">
                              {t('reservations.refundCashDesc', 'Refund {{amount}} in cash to customer.', { amount: formatCurrency(diff) })}
                            </p>
                          ) : (
                            <p className="text-accent-error font-bold leading-normal">
                              {t('reservations.collectCashDesc', 'Collect additional {{amount}} in cash from customer.', { amount: formatCurrency(Math.abs(diff)) })}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  }
                  // Stripe Credit Card Billing summary
                  const authAmount = (returnRental?.totalCost || 0) + securityDepositAmount;
                  const finalCost = estimateData.totalFinalCost ?? 0;
                  const isExcess = finalCost > authAmount;
                  const excessAmount = finalCost - authAmount;
                  return (
                    <div className={`p-3.5 rounded-xl border text-fg-secondary text-xs space-y-2 animate-fade-in ${
                      isExcess
                        ? 'border-accent-error/20 bg-accent-error/15'
                        : 'border-emerald-500/20 bg-emerald-500/5'
                    }`}>
                      <span className={`font-bold block ${isExcess ? 'text-accent-error' : 'text-emerald-400'}`}>
                        {t('reservations.stripeBillingTitle', 'Stripe Credit Card Processing')}
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold">
                        <div>
                          <span className="text-fg-tertiary block text-[9px] uppercase">{t('reservations.preAuthAuthorized', 'Authorized Hold')}</span>
                          <span className="text-fg-main font-mono">{formatCurrency(authAmount)}</span>
                        </div>
                        <div>
                          <span className="text-fg-tertiary block text-[9px] uppercase">{t('reservations.actualFinalCost', 'Actual Cost')}</span>
                          <span className="text-fg-main font-mono">{formatCurrency(finalCost)}</span>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-border-surface/10">
                        {isExcess ? (
                          <p className="text-accent-error font-bold leading-normal">
                            {t('reservations.stripeExcessDesc', 'Capture full hold of {{auth}} and charge an additional {{excess}} on credit card.', {
                              auth: formatCurrency(authAmount),
                              excess: formatCurrency(excessAmount)
                            })}
                          </p>
                        ) : (
                          <p className="text-emerald-400 font-bold leading-normal">
                            {t('reservations.stripeCaptureDesc', 'Capture {{amount}} from the pre-authorized hold and release the remainder.', {
                              amount: formatCurrency(finalCost)
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}

                <div className="border-t border-border-surface/15 pt-4">
                  <span className="text-xs font-bold text-accent-primary uppercase tracking-widest block mb-2">{t('reservations.returnSignaturePrompt')}</span>
                  <SignaturePad onChange={setReturnSignature} onFileSelect={setPendingReturnSignatureFile} />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="secondary" onClick={() => setReturnStep(1)}>{t('common.cancel')}</Button>
                  <Button
                    onClick={handleConfirmReturn}
                    isLoading={uploadPhotoMutation.isPending || returnRentalMutation.isPending}
                    disabled={!returnSignature}
                  >
                    {t('reservations.confirmReturn')}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Success */}
            {returnStep === 4 && (
              <div className="flex flex-col items-center justify-center text-center py-6 space-y-4 animate-scale-up">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center text-emerald-500">
                  <Check className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-extrabold text-fg-main uppercase tracking-wider">{t('reservations.returnFinalized')}</h3>
                  {(() => {
                    const isCashRental = returnRental?.transactions?.some((t: any) => t.type === 'CASH');
                    const isCorporateRental = returnRental?.customer?.type === 'CORPORATE';
                    if (isCorporateRental) {
                      return (
                        <p className="text-xs text-fg-secondary max-w-sm" dangerouslySetInnerHTML={{ __html: t('reservations.returnDescCorporate', 'Corporate return finalized. The vehicle is now set to **UNDER INSPECTION** or **MAINTENANCE** and will be processed for cleaning before becoming available.') }} />
                      );
                    }
                    if (isCashRental) {
                      return (
                        <p className="text-xs text-fg-secondary max-w-sm" dangerouslySetInnerHTML={{ __html: t('reservations.returnDescCash', 'Cash return finalized and reconciled. The vehicle is now set to **UNDER INSPECTION** or **MAINTENANCE**.') }} />
                      );
                    }
                    return (
                      <p className="text-xs text-fg-secondary max-w-sm" dangerouslySetInnerHTML={{ __html: t('reservations.returnDesc') }} />
                    );
                  })()}
                </div>
                <div className="pt-4 w-full">
                  <Button className="w-full" onClick={closeReturn}>
                    {t('reservations.dismiss')}
                  </Button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* WALK-IN DIALOG OVERLAY */}
      {isWalkinOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in" onClick={closeWalkin}>
          <div className="bg-bg-card border border-border-surface max-w-lg w-full rounded-3xl p-6 shadow-2xl backdrop-blur-2xl animate-slide-up relative space-y-5 overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={closeWalkin}
              className="absolute top-5 right-5 text-fg-tertiary hover:text-fg-main cursor-pointer z-10"
            >
              ✕
            </button>

            <div>
              <span className="text-[9px] font-bold text-accent-primary uppercase tracking-widest block">{t('reservations.counterDesk')}</span>
              <h2 className="text-lg font-extrabold text-fg-main mt-0.5 uppercase">
                {walkinStep === 1 && t('reservations.stepWalkinParams')}
                {walkinStep === 2 && (isWalkinCorporate
                  ? t('reservations.stepAuthorizedDriver', 'Authorized Driver')
                  : t('reservations.stepWalkinLicense'))}
                {walkinStep === 3 && t('reservations.stepWalkinInspection')}
                {walkinStep === 4 && t('reservations.stepWalkinCard')}
                {walkinStep === 5 && t('reservations.stepWalkinSignature')}
                {walkinStep === 6 && t('reservations.stepWalkinSuccess')}
              </h2>
            </div>

            {/* Stepper Dots */}
            {walkinStep !== 6 && (
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map(idx => (
                  <div key={idx} className={`h-1.5 flex-1 rounded-full ${walkinStep >= idx ? 'bg-accent-primary' : 'bg-white/10'}`} />
                ))}
              </div>
            )}

            {walkinError && (
              <div className="p-2.5 rounded-lg bg-accent-error/15 border border-accent-error/20 text-accent-error text-xs font-semibold">
                {walkinError}
              </div>
            )}

            {/* Step 1: Parameters */}
            {walkinStep === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField label={t('reservations.selectCustomer')} required>
                    <select
                      value={walkinCustomer}
                      onChange={(e) => {
                        setWalkinCustomer(e.target.value);
                        const selected = customersData?.items?.find((c: any) => c.id === e.target.value);
                        if (selected) {
                          setWalkinLicNationalId(selected.nationalId || '');
                          setWalkinLicNumber(selected.licenseNumber || '');
                          setWalkinLicCountry(selected.licenseCountry || '');
                          setWalkinLicExpDate(selected.licenseExpDate ? new Date(selected.licenseExpDate).toISOString().split('T')[0] : '');
                          setWalkinLicPhotoUrl(selected.licensePhotoUrl || '');
                        }
                      }}
                      className="w-full h-9 rounded-lg border border-border-surface/40 bg-bg-inset text-xs font-semibold px-3 text-fg-secondary outline-none focus:border-accent-primary"
                      required
                    >
                      <option value="">{t('reservations.chooseCustomer')}</option>
                      {activeCustomers.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label={t('reservations.selectVehicle')} required>
                    <select
                      value={walkinVehicle}
                      onChange={(e) => {
                        setWalkinVehicle(e.target.value);
                        const selected = availableVehicles.find((v: any) => v.id === e.target.value);
                        if (selected) {
                          setWalkinRate(selected.vehicleType.baseDailyRate);
                          setWalkinOdometer(selected.odometer || 0);
                        }
                      }}
                      className="w-full h-9 rounded-lg border border-border-surface/40 bg-bg-inset text-xs font-semibold px-3 text-fg-secondary outline-none focus:border-accent-primary"
                      required
                    >
                      <option value="">{t('reservations.chooseCar')}</option>
                      {availableVehicles.map((v: any) => (
                        <option key={v.id} value={v.id}>{v.brand.name} {v.model.name} ({v.plateNumber})</option>
                      ))}
                    </select>
                  </FormField>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField label={t('reservations.rentalStart')} required>
                    <Input
                      type="date"
                      value={walkinStart}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWalkinStart(e.target.value)}
                      className="!h-9 rounded-lg"
                      required
                    />
                  </FormField>

                  <FormField label={t('reservations.returnDate')} required>
                    <Input
                      type="date"
                      value={walkinEnd}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWalkinEnd(e.target.value)}
                      className="!h-9 rounded-lg"
                      required
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label={t('reservations.dailyRate')} required>
                    <Input
                      type="number"
                      value={walkinRate}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWalkinRate(Number(e.target.value))}
                      className="!h-9 rounded-lg"
                      required
                      disabled
                    />
                  </FormField>
                </div>

                {isWalkinCorporate && selectedWalkinCustomer && (
                  <div className="p-3 rounded-xl border border-accent-primary/20 bg-accent-primary/5 text-fg-secondary text-xs space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-fg-primary">{t('reservations.corporateBilling', 'Corporate Billing')}</span>
                    </div>
                    <p className="text-fg-secondary leading-normal">
                      {t('catalog.corporateDesc', 'Credit limit: {{creditLimit}}.', { creditLimit: formatCurrency(selectedWalkinCustomer?.creditLimit ?? 0) })}
                    </p>
                    <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-accent-primary/10 font-semibold">
                      <div>
                        <span className="text-fg-tertiary block text-[10px] uppercase">{t('reservations.outstandingBalance', 'Outstanding')}</span>
                        <span className="text-fg-main text-xs">{formatCurrency(walkinOutstandingBalance)}</span>
                      </div>
                      <div>
                        <span className="text-fg-tertiary block text-[10px] uppercase">{t('reservations.remainingCredit', 'Available')}</span>
                        <span className={`text-xs ${walkinRemainingCredit <= 0 ? 'text-accent-error font-extrabold' : 'text-emerald-500 font-extrabold'}`}>
                          {formatCurrency(walkinRemainingCredit)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-border-surface/15">
                  <Button type="button" variant="secondary" onClick={closeWalkin}>{t('reservations.cancel')}</Button>
                  <Button type="button" onClick={() => setWalkinStep(2)}>{t('common.next')}</Button>
                </div>
              </div>
            )}

            {/* Step 2: License / Authorized Driver */}
            {walkinStep === 2 && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-bg-inset border border-border-surface/40 space-y-3">
                  <span className="text-xs text-fg-tertiary font-bold block uppercase leading-none">
                    {isWalkinCorporate
                      ? t('reservations.stepAuthorizedDriver', 'Authorized Driver')
                      : (isWalkinProfileIncomplete ? t('reservations.completeProfile') : t('reservations.registeredCreds'))}
                  </span>

                  {isWalkinCorporate ? (
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg border border-accent-primary/20 bg-accent-primary/5 text-xs text-fg-secondary">
                        {t('reservations.driverInfoPrompt', 'Verify the employee\'s authorization letter and enter their details below.')}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <FormField label={t('reservations.driverName', "Driver's Full Name")} required>
                          <Input
                            type="text"
                            placeholder={t('reservations.driverNamePlaceholder', 'e.g. Juan Pérez')}
                            value={walkinDriverName}
                            onChange={(e: any) => setWalkinDriverName(e.target.value)}
                            className="!h-9 rounded-lg"
                          />
                        </FormField>

                        <FormField label={t('reservations.driverLicenseNumber', "Driver's License Number")} required>
                          <Input
                            type="text"
                            placeholder={t('reservations.driverLicensePlaceholder', 'e.g. DL-12345')}
                            value={walkinDriverLicense}
                            onChange={(e: any) => setWalkinDriverLicense(e.target.value)}
                            className="!h-9 rounded-lg"
                          />
                        </FormField>

                        <FormField label={t('reservations.driverLicenseCountry', "License Country")} required>
                          <Input
                            type="text"
                            placeholder={t('customers.placeholderCountry')}
                            value={walkinDriverLicenseCountry}
                            onChange={(e: any) => setWalkinDriverLicenseCountry(e.target.value)}
                            className="!h-9 rounded-lg"
                          />
                        </FormField>

                        <FormField label={t('reservations.driverLicenseExpiry', "License Expiry")} required>
                          <Input
                            type="date"
                            value={walkinDriverLicenseExpDate}
                            onChange={(e: any) => setWalkinDriverLicenseExpDate(e.target.value)}
                            className="!h-9 rounded-lg"
                          />
                        </FormField>
                      </div>

                      <div className="pt-3 border-t border-border-surface/15">
                        <LicensePhotoCapture
                          value={walkinDriverLicensePhotoUrl}
                          onChange={setWalkinDriverLicensePhotoUrl}
                          onFileSelect={setPendingWalkinDriverLicenseFile}
                          required
                          label={t('customers.licensePhoto', "Driver's License Photo")}
                        />
                      </div>
                    </div>
                  ) : isWalkinProfileIncomplete ? (
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-xs text-amber-200">
                        {t('reservations.profileMissing')}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <FormField label={t('reservations.nationalId')} required>
                          <Input
                            type="text"
                            placeholder={t('customers.placeholderId')}
                            value={walkinLicNationalId}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWalkinLicNationalId(e.target.value)}
                            className="!h-9 rounded-lg"
                          />
                        </FormField>
                        <FormField label={t('reservations.driversLicense')} required>
                          <Input
                            type="text"
                            placeholder={t('customers.placeholderLicense')}
                            value={walkinLicNumber}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWalkinLicNumber(e.target.value)}
                            className="!h-9 rounded-lg"
                          />
                        </FormField>
                        <FormField label={t('reservations.licenseCountry')} required>
                          <Input
                            type="text"
                            placeholder={t('customers.placeholderCountry')}
                            value={walkinLicCountry}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWalkinLicCountry(e.target.value)}
                            className="!h-9 rounded-lg"
                          />
                        </FormField>
                        <FormField label={t('reservations.licenseExpiry')} required>
                          <Input
                            type="date"
                            value={walkinLicExpDate}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWalkinLicExpDate(e.target.value)}
                            className="!h-9 rounded-lg"
                          />
                        </FormField>
                      </div>

                      <div className="pt-3 border-t border-border-surface/15">
                        <LicensePhotoCapture
                          value={walkinLicPhotoUrl}
                          onChange={setWalkinLicPhotoUrl}
                          onFileSelect={setWalkinPendingLicenseFile}
                          required
                          label={t('customers.licensePhoto', "Driver's License Photo")}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-fg-tertiary block text-xs">{t('reservations.licenseNumberLabel')}</span>
                          <span className="text-fg-main font-bold font-mono">{selectedWalkinCustomer?.licenseNumber}</span>
                        </div>
                        <div>
                          <span className="text-fg-tertiary block text-xs">{t('reservations.expirationDate')}</span>
                          <span className={`font-bold ${selectedWalkinCustomer?.licenseExpDate && new Date(selectedWalkinCustomer.licenseExpDate) < new Date() ? 'text-accent-error' : 'text-emerald-500'}`}>
                            {selectedWalkinCustomer?.licenseExpDate ? new Date(selectedWalkinCustomer.licenseExpDate).toLocaleDateString() : '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-fg-tertiary block text-xs">{t('reservations.licenseCountryLabel')}</span>
                          <span className="text-fg-main font-bold">{selectedWalkinCustomer?.licenseCountry || '—'}</span>
                        </div>
                        <div>
                          <span className="text-fg-tertiary block text-xs">{t('reservations.nationalIdLabel')}</span>
                          <span className="text-fg-main font-bold">{selectedWalkinCustomer?.nationalId}</span>
                        </div>
                        <div>
                          <span className="text-fg-tertiary block text-xs">{t('reservations.profileStatus')}</span>
                          <span className="text-emerald-500 font-bold uppercase">{selectedWalkinCustomer?.status}</span>
                        </div>
                      </div>

                      {selectedWalkinCustomer?.licensePhotoUrl && (
                        <div className="mt-3 border-t border-border-surface/15 pt-3">
                          <span className="text-fg-tertiary block text-xs mb-1.5 uppercase font-bold tracking-wider">{t('customers.licensePhoto', "Driver's License Photo")}</span>
                          <div className="w-full aspect-[16/10] max-h-48 rounded-xl border border-border-surface/20 overflow-hidden bg-bg-inset">
                            <img
                              src={getImageProxyUrl(selectedWalkinCustomer.licensePhotoUrl)}
                              alt="License Record"
                              className="w-full h-full object-contain"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="secondary" onClick={() => setWalkinStep(1)}>{t('reservations.back')}</Button>
                  <Button onClick={handleNextWalkinStep} isLoading={walkinIsSavingProfile}>
                    {isWalkinCorporate ? t('common.next') : (isWalkinProfileIncomplete ? t('reservations.saveContinue') : t('common.next'))}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Vehicle Inspection */}
            {walkinStep === 3 && (
              <div className="space-y-4">
                <span className="text-xs font-bold text-accent-primary uppercase tracking-widest flex items-center gap-2">
                  <Camera className="w-3.5 h-3.5" />
                  {t('reservations.vehicleInspection')}
                </span>

                <div className="grid grid-cols-2 gap-4">
                  <FormField label={t('reservations.checkoutOdometer')} required>
                    <Input
                      type="number"
                      value={walkinOdometer}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWalkinOdometer(Number(e.target.value))}
                      className="!h-9 rounded-lg"
                      required
                    />
                  </FormField>

                  <FormField label={t('reservations.checkoutFuel')} required>
                    <select
                      value={walkinFuelLevel}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setWalkinFuelLevel(e.target.value)}
                      className="w-full h-9 rounded-lg border border-border-surface/40 bg-bg-inset text-xs font-semibold px-3 text-fg-secondary outline-none focus:border-accent-primary"
                    >
                      <option value="FULL">{t('common.fuelFull')}</option>
                      <option value="THREE_QUARTERS">{t('common.fuelThreeQuarters')}</option>
                      <option value="HALF">{t('common.fuelHalf')}</option>
                      <option value="QUARTER">{t('common.fuelQuarter')}</option>
                      <option value="EMPTY">{t('common.fuelEmpty')}</option>
                    </select>
                  </FormField>
                </div>

                <div className="border border-border-surface/30 p-3 rounded-xl bg-bg-surface/10 space-y-3">
                  <span className="text-[10px] font-bold text-fg-secondary uppercase tracking-wider block">{t('reservations.damageChecklist')}</span>
                  <div className="grid grid-cols-2 gap-3 text-xs font-semibold">
                    <label className="flex items-center gap-2 text-fg-secondary cursor-pointer">
                      <input type="checkbox" checked={walkinHasScratches} onChange={(e) => setWalkinHasScratches(e.target.checked)} className="w-3.5 h-3.5 rounded border border-border-surface/40 accent-accent-primary" />
                      {t('reservations.bodyScratches')}
                    </label>
                    <label className="flex items-center gap-2 text-fg-secondary cursor-pointer">
                      <input type="checkbox" checked={walkinHasBrokenGlass} onChange={(e) => setWalkinHasBrokenGlass(e.target.checked)} className="w-3.5 h-3.5 rounded border border-border-surface/40 accent-accent-primary" />
                      {t('reservations.brokenGlass')}
                    </label>
                    <label className="flex items-center gap-2 text-fg-secondary cursor-pointer">
                      <input type="checkbox" checked={walkinMissingSpareTire} onChange={(e) => setWalkinMissingSpareTire(e.target.checked)} className="w-3.5 h-3.5 rounded border border-border-surface/40 accent-accent-primary" />
                      {t('reservations.missingSpareTire')}
                    </label>
                    <label className="flex items-center gap-2 text-fg-secondary cursor-pointer">
                      <input type="checkbox" checked={walkinMissingJack} onChange={(e) => setWalkinMissingJack(e.target.checked)} className="w-3.5 h-3.5 rounded border border-border-surface/40 accent-accent-primary" />
                      {t('reservations.missingJack')}
                    </label>
                  </div>

                  <div className="border-t border-border-surface/10 pt-3 grid grid-cols-2 gap-4">
                    <FormField label={t('reservations.tireFL')}>
                      <select value={walkinTireFL} onChange={(e) => setWalkinTireFL(e.target.value)} className="w-full h-8 rounded-lg border border-border-surface/40 bg-bg-inset text-xs font-bold px-2 text-fg-secondary outline-none">
                        <option value="GOOD">{t('common.tireGood')}</option>
                        <option value="WORN">{t('common.tireWorn')}</option>
                        <option value="DAMAGED">{t('common.tireDamaged')}</option>
                        <option value="MISSING">{t('common.tireMissing')}</option>
                      </select>
                    </FormField>
                    <FormField label={t('reservations.tireFR')}>
                      <select value={walkinTireFR} onChange={(e) => setWalkinTireFR(e.target.value)} className="w-full h-8 rounded-lg border border-border-surface/40 bg-bg-inset text-xs font-bold px-2 text-fg-secondary outline-none">
                        <option value="GOOD">{t('common.tireGood')}</option>
                        <option value="WORN">{t('common.tireWorn')}</option>
                        <option value="DAMAGED">{t('common.tireDamaged')}</option>
                        <option value="MISSING">{t('common.tireMissing')}</option>
                      </select>
                    </FormField>
                    <FormField label={t('reservations.tireRL')}>
                      <select value={walkinTireRL} onChange={(e) => setWalkinTireRL(e.target.value)} className="w-full h-8 rounded-lg border border-border-surface/40 bg-bg-inset text-xs font-bold px-2 text-fg-secondary outline-none">
                        <option value="GOOD">{t('common.tireGood')}</option>
                        <option value="WORN">{t('common.tireWorn')}</option>
                        <option value="DAMAGED">{t('common.tireDamaged')}</option>
                        <option value="MISSING">{t('common.tireMissing')}</option>
                      </select>
                    </FormField>
                    <FormField label={t('reservations.tireRR')}>
                      <select value={walkinTireRR} onChange={(e) => setWalkinTireRR(e.target.value)} className="w-full h-8 rounded-lg border border-border-surface/40 bg-bg-inset text-xs font-bold px-2 text-fg-secondary outline-none">
                        <option value="GOOD">{t('common.tireGood')}</option>
                        <option value="WORN">{t('common.tireWorn')}</option>
                        <option value="DAMAGED">{t('common.tireDamaged')}</option>
                        <option value="MISSING">{t('common.tireMissing')}</option>
                      </select>
                    </FormField>
                  </div>
                </div>

                <FormField label={t('reservations.inspectionComments')}>
                  <textarea
                    value={walkinInspComments}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setWalkinInspComments(e.target.value)}
                    placeholder={t('reservations.inspectionCommentsPlaceholder')}
                    className="w-full h-16 p-3 rounded-lg border border-border-surface/40 bg-bg-inset text-xs font-semibold text-fg-secondary outline-none focus:border-accent-primary resize-none"
                  />
                </FormField>

                {/* Photos */}
                <div className="border border-border-surface/30 p-3 rounded-xl bg-bg-surface/10 space-y-3">
                  <span className="text-xs font-bold text-accent-primary uppercase tracking-widest flex items-center gap-2">
                    <Camera className="w-3.5 h-3.5" />
                    {t('reservations.vehiclePhotos')} <span className="text-fg-tertiary font-mono">({walkinPhotoSlots.filter(s => s.value).length}/5)</span>
                  </span>
                  <div className="flex flex-wrap gap-3">
                    {walkinPhotoSlots.map((slot, i) => (
                      <div key={i} className="relative w-full sm:w-[calc(50%-0.375rem)] lg:w-[calc(33.33%-0.5rem)] xl:w-[calc(25%-0.5625rem)] max-w-[240px] group">
                        <FileUploader
                          value={slot.value}
                          onChange={(url) => updateWalkinPhotoSlotValue(i, url)}
                          onFileSelect={(file) => updateWalkinPhotoSlotFile(i, file)}
                          showCamera
                          accept="image/*"
                          compact
                        />
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeWalkinPhotoSlot(i); }}
                          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-bg-card border border-border-surface/40 flex items-center justify-center text-fg-tertiary hover:text-accent-error hover:border-accent-error/40 transition-all shadow-sm z-10"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {walkinPhotoSlots.filter(s => s.value).length < 5 && (
                      <button
                        type="button"
                        onClick={addWalkinPhotoSlot}
                        className="w-full sm:w-[calc(50%-0.375rem)] lg:w-[calc(33.33%-0.5rem)] xl:w-[calc(25%-0.5625rem)] max-w-[240px] aspect-[4/3] rounded-xl border-2 border-dashed border-border-surface/40 bg-bg-inset/50 flex flex-col items-center justify-center gap-1.5 text-fg-tertiary hover:border-accent-primary hover:text-accent-primary transition-all cursor-pointer"
                      >
                        <Camera className="w-5 h-5" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">{t('reservations.addPhoto', 'Add Photo')}</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border-surface/15">
                  <Button type="button" variant="secondary" onClick={() => setWalkinStep(2)}>{t('common.back')}</Button>
                  <Button type="button" onClick={handleNextWalkinStep}>{t('common.next')}</Button>
                </div>
              </div>
            )}

            {/* Step 4: Credit Card */}
            {walkinStep === 4 && (
              <div className="space-y-4">
                {isWalkinCorporate ? (
                  <div className="space-y-4 animate-fade-in">
                    <span className="text-xs font-bold text-accent-primary uppercase tracking-widest block mb-2">
                      {t('reservations.corporateBilling', 'Corporate Billing')}
                    </span>
                    <div className="p-3.5 rounded-xl border border-accent-primary/20 bg-accent-primary/5 text-fg-secondary text-xs flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-accent-primary shrink-0" />
                        <span className="font-bold text-fg-primary block">
                          {t('catalog.corporateBilling', 'Corporate Billing')}
                        </span>
                      </div>
                      <p className="text-fg-secondary leading-normal">
                        {t('catalog.corporateDesc', 'This booking will be charged against your corporate credit line. Your credit limit is {{creditLimit}}.', { creditLimit: formatCurrency(selectedWalkinCustomer?.creditLimit ?? 0) })}
                      </p>
                      <div className="grid grid-cols-2 gap-2 mt-1 pt-2 border-t border-border-surface/10 font-semibold">
                        <div>
                          <span className="text-fg-tertiary block text-[10px] uppercase">{t('reservations.outstandingBalance', 'Outstanding Balance')}</span>
                          <span className="text-fg-main text-xs">{formatCurrency(walkinOutstandingBalance)}</span>
                        </div>
                        <div>
                          <span className="text-fg-tertiary block text-[10px] uppercase">{t('reservations.remainingCredit', 'Remaining Credit')}</span>
                          <span className={`text-xs ${walkinRemainingCredit < walkinRentCost ? 'text-accent-error font-extrabold' : 'text-emerald-500 font-extrabold'}`}>
                            {formatCurrency(walkinRemainingCredit)}
                          </span>
                        </div>
                      </div>
                      {walkinRemainingCredit < walkinRentCost && (
                        <div className="mt-2 p-2 rounded-lg bg-accent-error/15 border border-accent-error/20 text-accent-error text-[10px] font-bold">
                          {t('reservations.creditLimitExceededWarning', 'WARNING: Estimated cost ({{cost}}) exceeds the available remaining credit limit.', { cost: formatCurrency(walkinRentCost) })}
                        </div>
                      )}
                    </div>

                    <FormField label={t('catalog.purchaseOrderNumber', 'Purchase Order Number')} required>
                      <Input
                        type="text"
                        placeholder="e.g. PO-12345"
                        value={walkinPurchaseOrderNumber}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWalkinPurchaseOrderNumber(e.target.value)}
                        className="!h-9 rounded-lg"
                        required
                      />
                    </FormField>
                  </div>
                ) : (
                  <div className="space-y-4 animate-fade-in">
                    <span className="text-xs font-bold text-accent-primary uppercase tracking-widest block mb-2">
                      {t('reservations.paymentAndBilling', 'Payment & Billing')}
                    </span>

                    <FormField label={t('reservations.paymentMethod', 'Payment Method')} required>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 text-xs font-bold text-fg-secondary cursor-pointer">
                          <input
                            type="radio"
                            name="walkinPaymentMethod"
                            value="STRIPE"
                            checked={walkinPaymentMethod === 'STRIPE'}
                            onChange={() => setWalkinPaymentMethod('STRIPE')}
                            className="w-3.5 h-3.5 accent-accent-primary"
                          />
                          {t('reservations.payStripe', 'Stripe Credit Card')}
                        </label>
                        <label className="flex items-center gap-2 text-xs font-bold text-fg-secondary cursor-pointer">
                          <input
                            type="radio"
                            name="walkinPaymentMethod"
                            value="CASH"
                            checked={walkinPaymentMethod === 'CASH'}
                            onChange={() => setWalkinPaymentMethod('CASH')}
                            className="w-3.5 h-3.5 accent-accent-primary"
                          />
                          {t('reservations.payCash', 'Cash Payment')}
                        </label>
                      </div>
                    </FormField>

                    {walkinPaymentMethod === 'CASH' ? (
                      <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-fg-secondary text-xs space-y-2">
                        <div className="flex items-center gap-2 text-emerald-400 font-bold">
                          <Check className="w-4 h-4 shrink-0" />
                          <span>{t('reservations.cashPaymentUpfrontTitle', 'Collect Cash Upfront')}</span>
                        </div>
                        <p className="leading-normal">
                          {t('reservations.cashPaymentUpfrontDesc', 'Collect the rental amount plus the security deposit upfront at checkout.')}
                        </p>
                        <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-border-surface/10 font-bold text-[11px]">
                          <div>
                            <span className="text-fg-tertiary block text-[9px] uppercase">{t('reservations.rentCost', 'Estimated Rent')}</span>
                            <span className="text-fg-main font-mono text-xs">{formatCurrency(walkinRentCost)}</span>
                          </div>
                          <div>
                            <span className="text-fg-tertiary block text-[9px] uppercase">{t('reservations.securityDeposit', 'Security Deposit')}</span>
                            <span className="text-fg-main font-mono text-xs">{formatCurrency(securityDepositAmount)}</span>
                          </div>
                          <div>
                            <span className="text-fg-tertiary block text-[9px] uppercase">{t('reservations.totalUpfront', 'Total Upfront')}</span>
                            <span className="text-emerald-400 font-mono text-xs">{formatCurrency(walkinUpfrontCash)}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        {walkinCustomer && walkinCardsList.length > 0 && (
                          <div className="mb-4 space-y-2">
                            <span className="text-[10px] font-bold text-fg-secondary uppercase tracking-wider block">
                              {t('stripe.savedPaymentMethods')}
                            </span>
                            <div className="space-y-1.5">
                              {walkinCardsList.map((card: any) => (
                                <div
                                  key={card.id}
                                  onClick={() => {
                                    setWalkinUseNewCard(false);
                                    setWalkinCardToken(card.id);
                                  }}
                                  className={`p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                                    !walkinUseNewCard && walkinCardToken === card.id
                                      ? 'border-accent-primary bg-accent-primary/5'
                                      : 'border-border-surface/30 bg-bg-inset/40 hover:border-border-surface/60'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <input
                                      type="radio"
                                      name="walkinSavedCard"
                                      checked={!walkinUseNewCard && walkinCardToken === card.id}
                                      onChange={() => {}}
                                      className="accent-accent-primary"
                                    />
                                    <div className="text-left text-xs">
                                      <p className="font-bold text-fg-main uppercase">
                                        {card.card.brand} ending in {card.card.last4}
                                      </p>
                                      <p className="text-[10px] text-fg-tertiary">
                                        Expires {card.card.exp_month}/{card.card.exp_year}
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (confirm(t('stripe.confirmRemoveCard'))) {
                                        try {
                                          setWalkinError(null);
                                          await deleteWalkinCardMutation.mutateAsync(card.id);
                                          setToastMessage(t('stripe.cardRemoved'));
                                          refetchWalkinSavedCards();
                                        } catch (err: any) {
                                          setWalkinError(err.message || t('common.operationFailed'));
                                        }
                                      }
                                    }}
                                    className="p-1.5 text-fg-tertiary hover:text-accent-error transition-all rounded-lg hover:bg-white/5 cursor-pointer flex items-center justify-center shrink-0"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              ))}

                              <div
                                onClick={() => {
                                  setWalkinUseNewCard(true);
                                  setWalkinCardToken(null);
                                }}
                                className={`p-3 rounded-xl border transition-all flex items-center gap-2.5 cursor-pointer ${
                                  walkinUseNewCard
                                    ? 'border-accent-primary bg-accent-primary/5'
                                    : 'border-border-surface/30 bg-bg-inset/40 hover:border-border-surface/60'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="walkinSavedCard"
                                  checked={walkinUseNewCard}
                                  onChange={() => {}}
                                  className="accent-accent-primary"
                                />
                                <div className="text-left text-xs">
                                  <p className="font-bold text-fg-main uppercase">
                                    {t('stripe.useNewCard')}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {walkinUseNewCard ? (
                          <Elements stripe={stripePromise}>
                            <StripeCardForm onCardComplete={setWalkinCardToken} onCardSuccess={() => setToastMessage(t('stripe.cardConfirmed'))} />
                          </Elements>
                        ) : (
                          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-2">
                            <Check className="w-3.5 h-3.5" />
                            {t('stripe.savedCardSelected')}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-border-surface/15">
                  <Button type="button" variant="secondary" onClick={() => setWalkinStep(3)}>{t('common.back')}</Button>
                  <Button
                    type="button"
                    onClick={handleNextWalkinStep}
                    disabled={
                      (isWalkinCorporate && !walkinPurchaseOrderNumber.trim()) ||
                      (!isWalkinCorporate && walkinPaymentMethod === 'STRIPE' && !walkinCardToken)
                    }
                  >
                    {t('common.next')}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 5: Signature */}
            {walkinStep === 5 && (
              <div className="space-y-4">
                <span className="text-xs font-bold text-accent-primary uppercase tracking-widest block mb-2">{t('reservations.customerSignature')}</span>
                <SignaturePad onChange={setWalkinSignature} onFileSelect={setPendingWalkinSignatureFile} />

                <div className="flex justify-end gap-2 pt-2 border-t border-border-surface/15">
                  <Button type="button" variant="secondary" onClick={() => setWalkinStep(4)}>{t('common.back')}</Button>
                  <Button
                    onClick={handleCreateWalkin}
                    isLoading={uploadPhotoMutation.isPending || createRentalMutation.isPending}
                    disabled={!walkinSignature}
                  >
                    {t('reservations.createContract')}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 6: Success screen */}
            {walkinStep === 6 && (
              <div className="flex flex-col items-center justify-center text-center py-6 space-y-4 animate-scale-up">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center text-emerald-500">
                  <Check className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-extrabold text-fg-main uppercase tracking-wider">{t('reservations.stepWalkinSuccess')}</h3>
                  <p className="text-xs text-fg-secondary max-w-sm">
                    {t('reservations.walkinCompleteDesc')}
                  </p>
                </div>

                <div className="pt-4 w-full">
                  <Button className="w-full" onClick={closeWalkin}>
                    {t('reservations.dismiss')}
                  </Button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {toastMessage && (
        <Toast message={toastMessage} type="success" onClose={() => setToastMessage(null)} />
      )}

    </div>
  );
};
export default ReservationsPage;
