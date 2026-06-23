'use client';

import { useCallback, useState } from 'react';

import type { SubmitRequestInput } from '@/lib/api/hcm';
import { useSubmitRequest } from '@/lib/hooks';
import { HcmApiError } from '@/lib/api/hcm';
import { bobBalances } from '@/stories/fixtures';
import { DEMO_EMPLOYEE } from '@/lib/demo-users';

import { RequestForm } from './RequestForm';

export function RequestFormConnected() {
  const { submitAsync, isOptimistic } = useSubmitRequest();
  const [serverError, setServerError] = useState<string | undefined>();
  const [successMessage, setSuccessMessage] = useState<string | undefined>();
  const [formKey, setFormKey] = useState(0);

  const handleSubmit = useCallback(
    async (input: SubmitRequestInput) => {
      setServerError(undefined);
      setSuccessMessage(undefined);

      try {
        await submitAsync(input);
        setSuccessMessage('Request submitted successfully.');
        setFormKey((key) => key + 1);
      } catch (error) {
        if (error instanceof HcmApiError) {
          setServerError(error.message);
        } else if (error instanceof Error) {
          setServerError(error.message);
        } else {
          setServerError('Request submission failed.');
        }
      }
    },
    [submitAsync],
  );

  return (
    <RequestForm
      key={formKey}
      employeeId={DEMO_EMPLOYEE.id}
      locationId={DEMO_EMPLOYEE.locationId}
      availableBalances={bobBalances}
      onSubmit={(input) => void handleSubmit(input)}
      isSubmitting={isOptimistic}
      serverError={serverError}
      successMessage={successMessage}
    />
  );
}
