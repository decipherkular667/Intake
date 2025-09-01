import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertHealthProfileSchema } from "@shared/schema";
import type { InsertHealthProfile } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { UserCircle, Stethoscope, AlertTriangle, Pill, Cigarette, Plus, X } from "lucide-react";
import { useHealthProfile } from "@/hooks/use-health-profile";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";

export default function HealthSurvey() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const { createHealthProfile, isCreating } = useHealthProfile();
  const [conditions, setConditions] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [medications, setMedications] = useState<{name: string; dosage?: string}[]>([]);
  const [smokingStatus, setSmokingStatus] = useState<string>("never");
  const [newCondition, setNewCondition] = useState("");
  const [newAllergy, setNewAllergy] = useState("");
  const [newMedication, setNewMedication] = useState("");

  const form = useForm<InsertHealthProfile>({
    resolver: zodResolver(insertHealthProfileSchema),
    defaultValues: {
      name: "",
      height: 170,
      weight: 70,
      birthYear: 1995,
      birthMonth: 1,
      medicalConditions: [],
      allergies: [],
      medications: [],
      smokingStatus: "never",
    },
  });

  const onSubmit = async (data: InsertHealthProfile) => {
    try {
      const profileData = {
        ...data,
        medicalConditions: conditions,
        allergies,
        medications,
        smokingStatus,
      };
      
      await createHealthProfile(profileData);
      toast({
        title: t('profileSaved'),
        description: t('profileSaved'),
      });
    } catch (error) {
      toast({
        title: t('error'),
        description: "Failed to save health profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  const addCondition = () => {
    if (newCondition.trim() && !conditions.includes(newCondition.trim())) {
      setConditions([...conditions, newCondition.trim()]);
      setNewCondition("");
    }
  };

  const removeCondition = (condition: string) => {
    setConditions(conditions.filter(c => c !== condition));
  };

  const addAllergy = () => {
    if (newAllergy.trim() && !allergies.includes(newAllergy.trim())) {
      setAllergies([...allergies, newAllergy.trim()]);
      setNewAllergy("");
    }
  };

  const removeAllergy = (allergy: string) => {
    setAllergies(allergies.filter(a => a !== allergy));
  };

  const addMedication = () => {
    if (newMedication.trim()) {
      setMedications([...medications, { name: newMedication.trim() }]);
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

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-custom to-green-600 text-white p-6 mx-4 mt-4 rounded-xl">
        <h2 className="text-xl font-semibold mb-2">{t('healthProfile')}</h2>
        <p className="text-green-100 text-sm">Help us provide personalized nutrition insights</p>
        <div className="mt-4 bg-white/20 rounded-lg p-3">
          <div className="flex items-center justify-between text-sm">
            <span>Profile Completion</span>
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
                  placeholder="Enter your full name"
                  className="mt-2"
                  data-testid="input-name"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.name.message}</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    {...form.register("height", { valueAsNumber: true })}
                    placeholder="170"
                    className="mt-2"
                    data-testid="input-height"
                  />
                  {form.formState.errors.height && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.height.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    {...form.register("weight", { valueAsNumber: true })}
                    placeholder="70"
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
                  <Label>Birth Year</Label>
                  <Select
                    value={form.watch("birthYear")?.toString()}
                    onValueChange={(value) => form.setValue("birthYear", parseInt(value))}
                  >
                    <SelectTrigger className="mt-2" data-testid="select-birth-year">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - i).map(year => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Birth Month</Label>
                  <Select
                    value={form.watch("birthMonth")?.toString()}
                    onValueChange={(value) => form.setValue("birthMonth", parseInt(value))}
                  >
                    <SelectTrigger className="mt-2" data-testid="select-birth-month">
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"
                      ].map((month, index) => (
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
              Medical Conditions
            </h3>
            
            <div className="space-y-4">
              <div>
                <Label>Search & Add Conditions</Label>
                <div className="relative mt-2">
                  <Input
                    value={newCondition}
                    onChange={(e) => setNewCondition(e.target.value)}
                    placeholder="Type condition (e.g., diabetes, hypertension)"
                    className="pr-12"
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addCondition())}
                    data-testid="input-condition"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-primary-custom"
                    onClick={addCondition}
                    data-testid="button-add-condition"
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
              Food Allergies
            </h3>
            
            <div className="space-y-4">
              <div>
                <Label>Add Allergies</Label>
                <div className="relative mt-2">
                  <Input
                    value={newAllergy}
                    onChange={(e) => setNewAllergy(e.target.value)}
                    placeholder="Type allergy (e.g., nuts, dairy, shellfish)"
                    className="pr-12"
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addAllergy())}
                    data-testid="input-allergy"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-warning-custom"
                    onClick={addAllergy}
                    data-testid="button-add-allergy"
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
              Current Medications
            </h3>
            
            <div className="space-y-4">
              <div>
                <Label>Add Medication</Label>
                <div className="relative mt-2">
                  <Input
                    value={newMedication}
                    onChange={(e) => setNewMedication(e.target.value)}
                    placeholder="Enter medication name"
                    className="pr-12"
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addMedication())}
                    data-testid="input-medication"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-secondary-custom"
                    onClick={addMedication}
                    data-testid="button-add-medication"
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>
              </div>
              
              {/* Selected Medications */}
              {medications.length > 0 && (
                <div className="space-y-2" data-testid="medications-list">
                  {medications.map((medication, index) => (
                    <div key={index} className="bg-blue-50 p-3 rounded-lg flex items-center justify-between">
                      <div>
                        <span className="text-blue-700 font-medium">{medication.name}</span>
                        {medication.dosage && (
                          <p className="text-blue-600 text-sm">{medication.dosage}</p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-blue-700 hover:bg-blue-100"
                        onClick={() => removeMedication(index)}
                        data-testid={`remove-medication-${index}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
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
              Smoking Habits
            </h3>
            
            <div className="space-y-4">
              <div>
                <Label>Do you smoke?</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {["never", "former", "current"].map((status) => (
                    <Button
                      key={status}
                      type="button"
                      variant={smokingStatus === status ? "default" : "outline"}
                      className={`capitalize ${
                        smokingStatus === status 
                          ? "bg-primary-custom text-white" 
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                      onClick={() => setSmokingStatus(status)}
                      data-testid={`smoking-${status}`}
                    >
                      {status}
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
          disabled={isCreating}
          data-testid="button-save-profile"
        >
          {isCreating ? "Saving..." : "Save Health Profile"}
        </Button>
      </form>
    </div>
  );
}
