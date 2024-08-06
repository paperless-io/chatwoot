<script setup>
import {
  required,
  url as urlValidator,
  minLength,
} from '@vuelidate/validators';
import wootConstants from 'dashboard/constants/globals';
import { getEventNamei18n } from './webhookHelper';
import useVuelidate from '@vuelidate/core';
import { computed, ref } from 'vue';

const props = defineProps({
  value: {
    type: Object,
    default: () => ({}),
  },
  isSubmitting: {
    type: Boolean,
    default: false,
  },
  submitLabel: {
    type: String,
    required: true,
  },
});

const { EXAMPLE_WEBHOOK_URL } = wootConstants;

const SUPPORTED_WEBHOOK_EVENTS = [
  'conversation_created',
  'conversation_status_changed',
  'conversation_updated',
  'message_created',
  'message_updated',
  'webwidget_triggered',
  'contact_created',
  'contact_updated',
];

const v$ = useVuelidate();

const validations = () => ({
  url: {
    required,
    minLength: minLength(7),
    url: urlValidator,
  },
  subscriptions: {
    required,
  },
});

const url = ref(props.value.url || '');
const subscriptions = ref(props.values.subscriptions || []);

const webhookURLInputPlaceholder = computed(() => {
  return this.$t('INTEGRATION_SETTINGS.WEBHOOK.FORM.END_POINT.PLACEHOLDER', {
    webhookExampleURL: EXAMPLE_WEBHOOK_URL,
  });
});

const onSubmit = () => {
  this.$emit('submit', {
    url: this.url,
    subscriptions: this.subscriptions,
  });
};
</script>

<template>
  <form class="flex flex-col w-full" @submit.prevent="onSubmit">
    <div class="w-full">
      <label :class="{ error: v$.url.$error }">
        {{ $t('INTEGRATION_SETTINGS.WEBHOOK.FORM.END_POINT.LABEL') }}
        <input
          v-model.trim="url"
          type="text"
          name="url"
          :placeholder="webhookURLInputPlaceholder"
          @input="v$.url.$touch"
        />
        <span v-if="v$.url.$error" class="message">
          {{ $t('INTEGRATION_SETTINGS.WEBHOOK.FORM.END_POINT.ERROR') }}
        </span>
      </label>
      <label :class="{ error: v$.url.$error }" class="mb-2">
        {{ $t('INTEGRATION_SETTINGS.WEBHOOK.FORM.SUBSCRIPTIONS.LABEL') }}
      </label>
      <div class="flex flex-col gap-2.5 mb-4">
        <div
          v-for="event in SUPPORTED_WEBHOOK_EVENTS"
          :key="event"
          class="flex items-center"
        >
          <input
            :id="event"
            v-model="subscriptions"
            type="checkbox"
            :value="event"
            name="subscriptions"
            class="mr-2"
          />
          <label :for="event" class="text-sm">
            {{ `${$t(getEventNamei18n(event))} (${event})` }}
          </label>
        </div>
      </div>
    </div>

    <div class="flex flex-row justify-end gap-2 py-2 px-0 w-full">
      <div class="w-full">
        <woot-button
          :disabled="v$.$invalid || isSubmitting"
          :is-loading="isSubmitting"
        >
          {{ submitLabel }}
        </woot-button>
        <woot-button class="button clear" @click.prevent="$emit('cancel')">
          {{ $t('INTEGRATION_SETTINGS.WEBHOOK.FORM.CANCEL') }}
        </woot-button>
      </div>
    </div>
  </form>
</template>
