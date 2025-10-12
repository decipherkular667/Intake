import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertHealthProfileSchema } from "@shared/schema-sqlite";
import type { InsertHealthProfile } from "@shared/schema-sqlite";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { UserCircle, Stethoscope, AlertTriangle, Pill, Cigarette, Plus, X } from "lucide-react";
import { useHealthProfile } from "@/hooks/use-health-profile";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from '@/contexts/language-context';

// function HealthSurvey() {
//   const { t } = useLanguage();
  
//   return (
//     <div>
//       {/* Known translations */}
//       <h1>{t('healthProfileDescription')}</h1>
      
//       {/* Any hardcoded text that's not in translations */}
//       <label><AutoTranslate>Gender</AutoTranslate></label>
//       <label><AutoTranslate>Activity Level</AutoTranslate></label>
      
//       {/* Dynamic placeholders */}
//       <input placeholder={t('enterFullName')} />
//     </div>
//   );
// }

export default function HealthSurvey() {
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { profile, createHealthProfile, updateHealthProfile, isCreating, isUpdating } = useHealthProfile();
  const [conditions, setConditions] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [medications, setMedications] = useState<{name: string; dosage?: string}[]>([]);
  const [smokingStatus, setSmokingStatus] = useState<string>("never");
  const [gender, setGender] = useState<string | undefined>(undefined);
  const [newCondition, setNewCondition] = useState("");
  const [newAllergy, setNewAllergy] = useState("");
  const [newMedication, setNewMedication] = useState("");
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('metric');
  const [displayHeight, setDisplayHeight] = useState<number>(170);
  const [displayWeight, setDisplayWeight] = useState<number>(70);
  const [heightFeet, setHeightFeet] = useState<number>(5);
  const [heightInches, setHeightInches] = useState<number>(7);

  // Conversion functions
  const cmToFeetAndInches = (cm: number) => {
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return { feet, inches };
  };
  const feetAndInchesToCm = (feet: number, inches: number) => Math.round((feet * 12 + inches) * 2.54);
  const kgToLbs = (kg: number) => Math.round(kg * 2.20462);
  const lbsToKg = (lbs: number) => Math.round(lbs / 2.20462);

  const form = useForm<InsertHealthProfile>({
    resolver: zodResolver(insertHealthProfileSchema),
    defaultValues: {
      name: user ? `${user.firstName} ${user.lastName}`.trim() : "",
      gender: undefined,
      height: 170,
      weight: 70,
      birthYear: 1995,
      birthMonth: 1,
      medicalConditions: [],
      allergies: [],
      medications: [],
      smokingStatus: "never",
      smokingFrequency: undefined,
      activityLevel: undefined,
      dietaryRestrictions: [],
      healthGoals: [],
    },
  });

  // Pre-fill name from user data when no profile exists
  useEffect(() => {
    if (user && !profile) {
      const userName = `${user.firstName} ${user.lastName}`.trim();
      if (userName) {
        form.setValue('name', userName);
      }
    }
  }, [user, profile, form]);

  // Populate form with existing profile data
  useEffect(() => {
    if (profile) {
      console.log('Populating form with profile:', profile);
      const metricHeight = profile.height || 170;
      const metricWeight = profile.weight || 70;

      // Always set metric values
      setDisplayHeight(metricHeight);
      setDisplayWeight(metricWeight);

      // Also calculate and set imperial values
      const { feet, inches } = cmToFeetAndInches(metricHeight);
      setHeightFeet(feet);
      setHeightInches(inches);

      form.reset({
        name: profile.name || "",
        gender: profile.gender || undefined,
        height: metricHeight,
        weight: metricWeight,
        birthYear: profile.birthYear || 1995,
        birthMonth: profile.birthMonth || 1,
        smokingStatus: profile.smokingStatus || "never",
        smokingFrequency: profile.smokingFrequency || undefined,
        activityLevel: profile.activityLevel || undefined,
        medicalConditions: Array.isArray(profile.medicalConditions) ? profile.medicalConditions : [],
        allergies: Array.isArray(profile.allergies) ? profile.allergies : [],
        medications: Array.isArray(profile.medications) ? profile.medications : [],
        dietaryRestrictions: Array.isArray(profile.dietaryRestrictions) ? profile.dietaryRestrictions : [],
        healthGoals: Array.isArray(profile.healthGoals) ? profile.healthGoals : [],
      });

      // Update local state arrays - handle both arrays and JSON strings
      const parseArrayField = (field: any): string[] => {
        if (Array.isArray(field)) return field;
        if (typeof field === 'string') {
          try {
            const parsed = JSON.parse(field);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        }
        return [];
      };

      setConditions(parseArrayField(profile.medicalConditions));
      setAllergies(parseArrayField(profile.allergies));

      // Handle medications - convert string array back to objects
      const parseMedicationsField = (field: any): {name: string; dosage?: string}[] => {
        if (Array.isArray(field)) {
          // Check if it's already object format
          if (field.length > 0 && typeof field[0] === 'object' && field[0].name) {
            return field;
          }
          // Convert string format back to objects
          return field.map((med: string) => {
            const match = med.match(/^(.+?)\s*\((.+)\)$/) || med.match(/^(.+)$/);
            return match ? { name: match[1]?.trim(), dosage: match[2]?.trim() } : { name: med };
          });
        }
        if (typeof field === 'string') {
          try {
            const parsed = JSON.parse(field);
            return Array.isArray(parsed) ? parseMedicationsField(parsed) : [];
          } catch {
            return [];
          }
        }
        return [];
      };

      setMedications(parseMedicationsField(profile.medications));
      setSmokingStatus(profile.smokingStatus || "never");
      setGender(profile.gender || undefined);
    }
  }, [profile, unitSystem]);

  // Handle unit system changes - convert current values
  useEffect(() => {
    // When switching TO imperial, convert from metric
    if (unitSystem === 'imperial') {
      const currentHeightCm = displayHeight; // Use current display value
      const currentWeightKg = displayWeight;

      const { feet, inches } = cmToFeetAndInches(currentHeightCm);
      setHeightFeet(feet);
      setHeightInches(inches);
      setDisplayWeight(kgToLbs(currentWeightKg));

      // Update form with current metric values
      form.setValue('height', currentHeightCm);
      form.setValue('weight', currentWeightKg);
    }
    // When switching TO metric, convert from imperial
    else {
      const currentHeightCm = feetAndInchesToCm(heightFeet, heightInches);
      const currentWeightKg = lbsToKg(displayWeight);

      setDisplayHeight(currentHeightCm);
      setDisplayWeight(currentWeightKg);

      // Update form with converted metric values
      form.setValue('height', currentHeightCm);
      form.setValue('weight', currentWeightKg);
    }
  }, [unitSystem]);

  // Update "None" values when language changes
  useEffect(() => {
    const translatedNone = t('none');

    // Update conditions
    setConditions(prev => prev.map(item =>
      (item === 'None' || item === '无') ? translatedNone : item
    ));

    // Update allergies
    setAllergies(prev => prev.map(item =>
      (item === 'None' || item === '无') ? translatedNone : item
    ));

    // Update medications
    setMedications(prev => prev.map(med => ({
      ...med,
      name: (med.name === 'None' || med.name === '无') ? translatedNone : med.name
    })));
  }, [language, t]);

  const onSubmit = async (data: InsertHealthProfile) => {
    console.log('Form onSubmit called with data:', data);
    console.log('Form validation errors:', form.formState.errors);
    try {
      // Convert imperial to metric if needed
      const metricHeight = unitSystem === 'imperial' ? feetAndInchesToCm(heightFeet, heightInches) : displayHeight;
      const metricWeight = unitSystem === 'imperial' ? lbsToKg(displayWeight) : displayWeight;

      const profileData = {
        ...data,
        height: metricHeight,
        weight: metricWeight,
        gender,
        medicalConditions: conditions,
        allergies,
        medications: medications.map(med => med.dosage ? `${med.name} (${med.dosage})` : med.name),
        smokingStatus,
      };
      console.log('Sending profile data:', profileData);

      if (profile?.id) {
        // Update existing profile
        await updateHealthProfile({ id: profile.id, data: profileData });
      } else {
        // Create new profile
        await createHealthProfile(profileData);
      }
      toast({
        title: t('profileSaved'),
      });
    } catch (error) {
      toast({
        title: t('error'),
        description: t('failedToSave'),
        variant: "destructive",
      });
    }
  };

  const addCondition = () => {
    if (newCondition.trim() && !conditions.includes(newCondition.trim())) {
      // Remove "None" when adding actual conditions
      const filteredConditions = conditions.filter(c => c !== 'None' && c !== t('none') && c !== '无');
      setConditions([...filteredConditions, newCondition.trim()]);
      setNewCondition("");
    }
  };

  const removeCondition = (condition: string) => {
    setConditions(conditions.filter(c => c !== condition));
  };

  const addAllergy = () => {
    if (newAllergy.trim() && !allergies.includes(newAllergy.trim())) {
      // Remove "None" when adding actual allergies
      const filteredAllergies = allergies.filter(a => a !== 'None' && a !== t('none') && a !== '无');
      setAllergies([...filteredAllergies, newAllergy.trim()]);
      setNewAllergy("");
    }
  };

  const removeAllergy = (allergy: string) => {
    setAllergies(allergies.filter(a => a !== allergy));
  };

  const addMedication = () => {
    if (newMedication.trim()) {
      // Remove "None" when adding actual medications
      const filteredMedications = medications.filter(m => m.name !== 'None' && m.name !== t('none') && m.name !== '无');
      setMedications([...filteredMedications, { name: newMedication.trim() }]);
      setNewMedication("");
    }
  };

  const removeMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const completionPercentage = Math.min(100, Math.max(0, 
    (form.watch("name") ? 20 : 0) +
    (form.watch("height") ? 10 : 0) +
    (form.watch("weight") ? 10 : 0) +
    (form.watch("birthYear") ? 10 : 0) +
    (form.watch("birthMonth") ? 10 : 0) +
    (conditions.length > 0 ? 20 : 0) +
    (allergies.length > 0 ? 10 : 0) +
    (medications.length > 0 ? 10 : 0)
  ));

  // Month translation array
  const monthNames = [
    t('january'), t('february'), t('march'), t('april'),
    t('may'), t('june'), t('july'), t('august'),
    t('september'), t('october'), t('november'), t('december')
  ];

  // Smoking status options
  const smokingOptions = [
    { key: 'never', label: t('never') },
    { key: 'former', label: t('former') },
    { key: 'current', label: t('current') }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-custom to-green-600 text-white p-6 mx-4 mt-4 rounded-xl">
        <h2 className="text-xl font-semibold mb-2">{t('healthProfile')}</h2>
        <p className="text-green-100 text-sm">{t('healthProfileDescription')}</p>
        <div className="mt-4 bg-white/20 rounded-lg p-3">
          <div className="flex items-center justify-between text-sm">
            <span>{t('profileCompletion')}</span>
            <span data-testid="completion-percentage">{completionPercentage}%</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2 mt-2">
            <div 
              className="bg-white h-2 rounded-full transition-all duration-500" 
              style={{width: `${completionPercentage}%`}}
            ></div>
          </div>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="px-4 space-y-6">
        {/* Personal Information Card */}
        <Card>
          <CardContent className="p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <UserCircle className="text-primary-custom mr-2" />
              {t('personalInfo')}
            </h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">{t('name')}</Label>
                <Input
                  id="name"
                  {...form.register("name")}
                  placeholder={t('enterFullName')}
                  className="mt-2"
                  data-testid="input-name"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div>
                <Label>{t('gender')}</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Button
                    type="button"
                    variant={gender === 'male' ? "default" : "outline"}
                    className={`${
                      gender === 'male'
                        ? "bg-primary-custom text-white hover:bg-green-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                    onClick={() => {
                      setGender('male');
                      form.setValue('gender', 'male');
                    }}
                    data-testid="gender-male"
                  >
                    {t('male')}
                  </Button>
                  <Button
                    type="button"
                    variant={gender === 'female' ? "default" : "outline"}
                    className={`${
                      gender === 'female'
                        ? "bg-primary-custom text-white hover:bg-green-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                    onClick={() => {
                      setGender('female');
                      form.setValue('gender', 'female');
                    }}
                    data-testid="gender-female"
                  >
                    {t('female')}
                  </Button>
                </div>
              </div>

              {/* Unit System Selector */}
              <div>
                <Label>{t('unitSystem')}</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Button
                    type="button"
                    variant={unitSystem === 'metric' ? "default" : "outline"}
                    className={`${
                      unitSystem === 'metric'
                        ? "bg-primary-custom text-white hover:bg-green-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                    onClick={() => setUnitSystem('metric')}
                    data-testid="unit-metric"
                  >
                    {t('metric')}
                  </Button>
                  <Button
                    type="button"
                    variant={unitSystem === 'imperial' ? "default" : "outline"}
                    className={`${
                      unitSystem === 'imperial'
                        ? "bg-primary-custom text-white hover:bg-green-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                    onClick={() => setUnitSystem('imperial')}
                    data-testid="unit-imperial"
                  >
                    {t('imperial')}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="height">
                    {t('height')} ({unitSystem === 'metric' ? 'cm' : 'ft/in'})
                  </Label>
                  {unitSystem === 'metric' ? (
                    <Input
                      id="height"
                      type="number"
                      value={displayHeight}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0;
                        setDisplayHeight(value);
                        form.setValue('height', value);
                      }}
                      placeholder="170"
                      className="mt-2"
                      data-testid="input-height"
                    />
                  ) : (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center gap-1 flex-1">
                        <Input
                          type="number"
                          value={heightFeet}
                          onChange={(e) => {
                            const feet = parseInt(e.target.value) || 0;
                            setHeightFeet(feet);
                            const metricValue = feetAndInchesToCm(feet, heightInches);
                            form.setValue('height', metricValue);
                          }}
                          placeholder="5"
                          className="w-16"
                          data-testid="input-height-feet"
                        />
                        <span className="text-sm text-gray-600">ft</span>
                      </div>
                      <div className="flex items-center gap-1 flex-1">
                        <Input
                          type="number"
                          value={heightInches}
                          onChange={(e) => {
                            const inches = parseInt(e.target.value) || 0;
                            setHeightInches(inches);
                            const metricValue = feetAndInchesToCm(heightFeet, inches);
                            form.setValue('height', metricValue);
                          }}
                          placeholder="7"
                          className="w-16"
                          data-testid="input-height-inches"
                        />
                        <span className="text-sm text-gray-600">in</span>
                      </div>
                    </div>
                  )}
                  {form.formState.errors.height && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.height.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="weight">
                    {t('weight')} ({unitSystem === 'metric' ? 'kg' : 'lbs'})
                  </Label>
                  <Input
                    id="weight"
                    type="number"
                    value={displayWeight}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      setDisplayWeight(value);
                      // Update form with metric value
                      const metricValue = unitSystem === 'imperial' ? lbsToKg(value) : value;
                      form.setValue('weight', metricValue);
                    }}
                    placeholder={unitSystem === 'metric' ? '70' : '154'}
                    className="mt-2"
                    data-testid="input-weight"
                  />
                  {form.formState.errors.weight && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.weight.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('birthYear')}</Label>
                  <Select
                    value={form.watch("birthYear")?.toString()}
                    onValueChange={(value) => form.setValue("birthYear", parseInt(value))}
                  >
                    <SelectTrigger className="mt-2" data-testid="select-birth-year">
                      <SelectValue placeholder={t('selectYear')} />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - i).map(year => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('birthMonth')}</Label>
                  <Select
                    value={form.watch("birthMonth")?.toString()}
                    onValueChange={(value) => form.setValue("birthMonth", parseInt(value))}
                  >
                    <SelectTrigger className="mt-2" data-testid="select-birth-month">
                      <SelectValue placeholder={t('selectMonth')} />
                    </SelectTrigger>
                    <SelectContent>
                      {monthNames.map((month, index) => (
                        <SelectItem key={index + 1} value={(index + 1).toString()}>{month}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Medical Conditions Card */}
        <Card>
          <CardContent className="p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Stethoscope className="text-primary-custom mr-2" />
              {t('medicalConditions')}
            </h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <Label>{t('searchAddConditions')}</Label>
                  <Button
                    type="button"
                    variant={conditions.length === 1 && (conditions[0] === 'None' || conditions[0] === t('none')) ? "default" : "outline"}
                    size="sm"
                    className={`${
                      conditions.length === 1 && (conditions[0] === 'None' || conditions[0] === t('none'))
                        ? "bg-primary-custom text-white hover:bg-green-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                    onClick={() => {
                      // Toggle: if "None" is selected, deselect it; otherwise select it
                      if (conditions.length === 1 && (conditions[0] === 'None' || conditions[0] === t('none'))) {
                        setConditions([]);
                      } else {
                        setConditions([t('none')]);
                      }
                    }}
                    data-testid="button-none-condition"
                  >
                    {t('none')}
                  </Button>
                </div>
                <div className="relative mt-2">
                  <Input
                    value={newCondition}
                    onChange={(e) => setNewCondition(e.target.value)}
                    placeholder={t('typeConditionPlaceholder')}
                    className="pr-12"
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addCondition())}
                    data-testid="input-condition"
                    disabled={conditions.length === 1 && (conditions[0] === 'None' || conditions[0] === t('none'))}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-primary-custom"
                    onClick={addCondition}
                    data-testid="button-add-condition"
                    disabled={conditions.length === 1 && (conditions[0] === 'None' || conditions[0] === t('none'))}
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Selected Conditions */}
              {conditions.length > 0 && (
                <div className="flex flex-wrap gap-2" data-testid="conditions-list">
                  {conditions.map((condition, index) => (
                    <Badge key={index} variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100">
                      {condition}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="ml-1 h-auto p-0 text-blue-700 hover:bg-transparent"
                        onClick={() => removeCondition(condition)}
                        data-testid={`remove-condition-${index}`}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Allergies Card */}
        <Card>
          <CardContent className="p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <AlertTriangle className="text-warning-custom mr-2" />
              {t('foodAllergies')}
            </h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <Label>{t('addAllergies')}</Label>
                  <Button
                    type="button"
                    variant={allergies.length === 1 && (allergies[0] === 'None' || allergies[0] === t('none')) ? "default" : "outline"}
                    size="sm"
                    className={`${
                      allergies.length === 1 && (allergies[0] === 'None' || allergies[0] === t('none'))
                        ? "bg-primary-custom text-white hover:bg-green-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                    onClick={() => {
                      // Toggle: if "None" is selected, deselect it; otherwise select it
                      if (allergies.length === 1 && (allergies[0] === 'None' || allergies[0] === t('none'))) {
                        setAllergies([]);
                      } else {
                        setAllergies([t('none')]);
                      }
                    }}
                    data-testid="button-none-allergy"
                  >
                    {t('none')}
                  </Button>
                </div>
                <div className="relative mt-2">
                  <Input
                    value={newAllergy}
                    onChange={(e) => setNewAllergy(e.target.value)}
                    placeholder={t('typeAllergyPlaceholder')}
                    className="pr-12"
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addAllergy())}
                    data-testid="input-allergy"
                    disabled={allergies.length === 1 && (allergies[0] === 'None' || allergies[0] === t('none'))}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-warning-custom"
                    onClick={addAllergy}
                    data-testid="button-add-allergy"
                    disabled={allergies.length === 1 && (allergies[0] === 'None' || allergies[0] === t('none'))}
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Selected Allergies */}
              {allergies.length > 0 && (
                <div className="flex flex-wrap gap-2" data-testid="allergies-list">
                  {allergies.map((allergy, index) => (
                    <Badge key={index} variant="destructive" className="bg-red-50 text-red-700 hover:bg-red-100">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {allergy}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="ml-1 h-auto p-0 text-red-700 hover:bg-transparent"
                        onClick={() => removeAllergy(allergy)}
                        data-testid={`remove-allergy-${index}`}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Medications Card */}
        <Card>
          <CardContent className="p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Pill className="text-secondary-custom mr-2" />
              {t('currentMedications')}
            </h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <Label>{t('addMedication')}</Label>
                  <Button
                    type="button"
                    variant={medications.length === 1 && (medications[0].name === 'None' || medications[0].name === t('none')) ? "default" : "outline"}
                    size="sm"
                    className={`${
                      medications.length === 1 && (medications[0].name === 'None' || medications[0].name === t('none'))
                        ? "bg-primary-custom text-white hover:bg-green-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                    onClick={() => {
                      // Toggle: if "None" is selected, deselect it; otherwise select it
                      if (medications.length === 1 && (medications[0].name === 'None' || medications[0].name === t('none'))) {
                        setMedications([]);
                      } else {
                        setMedications([{ name: t('none') }]);
                      }
                    }}
                    data-testid="button-none-medication"
                  >
                    {t('none')}
                  </Button>
                </div>
                <div className="relative mt-2">
                  <Input
                    value={newMedication}
                    onChange={(e) => setNewMedication(e.target.value)}
                    placeholder={t('enterMedicationName')}
                    className="pr-12"
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addMedication())}
                    data-testid="input-medication"
                    disabled={medications.length === 1 && (medications[0].name === 'None' || medications[0].name === t('none'))}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-secondary-custom"
                    onClick={addMedication}
                    data-testid="button-add-medication"
                    disabled={medications.length === 1 && (medications[0].name === 'None' || medications[0].name === t('none'))}
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Selected Medications */}
              {medications.length > 0 && (
                <div className="flex flex-wrap gap-2" data-testid="medications-list">
                  {medications.map((medication, index) => (
                    <Badge key={index} variant="secondary" className="bg-purple-50 text-purple-700 hover:bg-purple-100">
                      {medication.name}
                      {medication.dosage && ` (${medication.dosage})`}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="ml-1 h-auto p-0 text-purple-700 hover:bg-transparent"
                        onClick={() => removeMedication(index)}
                        data-testid={`remove-medication-${index}`}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Smoking Habits Card */}
        <Card>
          <CardContent className="p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Cigarette className="text-gray-600 mr-2" />
              {t('smokingHabits')}
            </h3>
            
            <div className="space-y-4">
              <div>
                <Label>{t('doYouSmoke')}</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {smokingOptions.map((option) => (
                    <Button
                      key={option.key}
                      type="button"
                      variant={smokingStatus === option.key ? "default" : "outline"}
                      className={`${
                        smokingStatus === option.key 
                          ? "bg-primary-custom text-white" 
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                      onClick={() => setSmokingStatus(option.key)}
                      data-testid={`smoking-${option.key}`}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button
          type="submit"
          className="w-full bg-primary-custom text-white py-4 text-lg font-semibold hover:bg-green-700"
          disabled={isCreating || isUpdating}
          data-testid="button-save-profile"
          onClick={(e) => {
            console.log('Save button clicked!');
            console.log('Form errors:', form.formState.errors);
            console.log('Form valid:', form.formState.isValid);
            console.log('Form values:', form.getValues());
          }}
        >
          {(isCreating || isUpdating) ? t('saving') : (profile?.id ? t('updateHealthProfile') : t('saveHealthProfile'))}
        </Button>
      </form>
    </div>
  );
}