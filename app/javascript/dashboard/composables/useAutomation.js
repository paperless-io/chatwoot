import { computed } from 'vue';
import { useStoreGetters } from 'dashboard/composables/store';
import { useAlert } from 'dashboard/composables';
import { useI18n } from './useI18n';
import languages from 'dashboard/components/widgets/conversation/advancedFilterItems/languages';
import countries from 'shared/constants/countries';
import {
  generateCustomAttributeTypes,
  getActionOptions,
  getConditionOptions,
  getCustomAttributeInputType,
  getOperatorTypes,
  isACustomAttribute,
  getDefaultConditions,
  getDefaultActions,
  filterCustomAttributes,
  getStandardAttributeInputType,
  isCustomAttribute,
  generateCustomAttributes,
} from 'dashboard/helper/automationHelper';

export function useAutomation() {
  const getters = useStoreGetters();
  const { t } = useI18n();

  const agents = computed(() => getters['agents/getAgents'].value);
  const campaigns = computed(() => getters['campaigns/getAllCampaigns'].value);
  const contacts = computed(() => getters['contacts/getContacts'].value);
  const inboxes = computed(() => getters['inboxes/getInboxes'].value);
  const labels = computed(() => getters['labels/getLabels'].value);
  const teams = computed(() => getters['teams/getTeams'].value);
  const slaPolicies = computed(() => getters['sla/getSLA'].value);

  const booleanFilterOptions = computed(() => [
    { id: true, name: t('FILTER.ATTRIBUTE_LABELS.TRUE') },
    { id: false, name: t('FILTER.ATTRIBUTE_LABELS.FALSE') },
  ]);

  const statusFilterOptions = computed(() => {
    const statusFilters = t('CHAT_LIST.CHAT_STATUS_FILTER_ITEMS');
    return [
      ...Object.keys(statusFilters).map(status => ({
        id: status,
        name: statusFilters[status].TEXT,
      })),
      { id: 'all', name: t('CHAT_LIST.FILTER_ALL') },
    ];
  });

  const onEventChange = automation => {
    automation.conditions = getDefaultConditions(automation.event_name);
    automation.actions = getDefaultActions();
  };

  const getAttributes = (automationTypes, key) => {
    return automationTypes[key].conditions;
  };

  const getAutomationType = (automationTypes, automation, key) => {
    return automationTypes[automation.event_name].conditions.find(
      condition => condition.key === key
    );
  };

  const getInputType = (
    allCustomAttributes,
    automationTypes,
    automation,
    key
  ) => {
    const customAttribute = isACustomAttribute(allCustomAttributes, key);
    if (customAttribute) {
      return getCustomAttributeInputType(
        customAttribute.attribute_display_type
      );
    }
    const type = getAutomationType(automationTypes, automation, key);
    return type.inputType;
  };

  const getOperators = (
    allCustomAttributes,
    automationTypes,
    automation,
    mode,
    key
  ) => {
    if (mode === 'edit') {
      const customAttribute = isACustomAttribute(allCustomAttributes, key);
      if (customAttribute) {
        return getOperatorTypes(customAttribute.attribute_display_type);
      }
    }
    const type = getAutomationType(automationTypes, automation, key);
    return type.filterOperators;
  };

  const getCustomAttributeType = (automationTypes, automation, key) => {
    return automationTypes[automation.event_name].conditions.find(
      i => i.key === key
    ).customAttributeType;
  };

  const getConditionDropdownValues = type => {
    return getConditionOptions({
      agents: agents.value,
      booleanFilterOptions: booleanFilterOptions.value,
      campaigns: campaigns.value,
      contacts: contacts.value,
      customAttributes: getters['attributes/getAttributes'].value,
      inboxes: inboxes.value,
      statusFilterOptions: statusFilterOptions.value,
      teams: teams.value,
      languages,
      countries,
      type,
    });
  };

  const appendNewCondition = automation => {
    automation.conditions.push(...getDefaultConditions(automation.event_name));
  };

  const appendNewAction = automation => {
    automation.actions.push(...getDefaultActions());
  };

  const removeFilter = (automation, index) => {
    if (automation.conditions.length <= 1) {
      useAlert(t('AUTOMATION.CONDITION.DELETE_MESSAGE'));
    } else {
      automation.conditions.splice(index, 1);
    }
  };

  const removeAction = (automation, index) => {
    if (automation.actions.length <= 1) {
      useAlert(t('AUTOMATION.ACTION.DELETE_MESSAGE'));
    } else {
      automation.actions.splice(index, 1);
    }
  };

  const resetFilter = (
    automation,
    automationTypes,
    index,
    currentCondition
  ) => {
    automation.conditions[index].filter_operator = automationTypes[
      automation.event_name
    ].conditions.find(
      condition => condition.key === currentCondition.attribute_key
    ).filterOperators[0].value;
    automation.conditions[index].values = '';
  };

  const showActionInput = (automationActionTypes, action) => {
    if (action === 'send_email_to_team' || action === 'send_message')
      return false;
    const type = automationActionTypes.find(i => i.key === action).inputType;
    return !!type;
  };

  const resetAction = (automation, index) => {
    automation.actions[index].action_params = [];
  };

  const manifestConditions = (
    automation,
    allCustomAttributes,
    automationTypes
  ) => {
    const customAttributes = filterCustomAttributes(allCustomAttributes);
    return automation.conditions.map(condition => {
      const customAttr = isCustomAttribute(
        customAttributes,
        condition.attribute_key
      );
      let inputType = 'plain_text';
      if (customAttr) {
        inputType = getCustomAttributeInputType(customAttr.type);
      } else {
        inputType = getStandardAttributeInputType(
          automationTypes,
          automation.event_name,
          condition.attribute_key
        );
      }
      if (inputType === 'plain_text' || inputType === 'date') {
        return { ...condition, values: condition.values[0] };
      }
      if (inputType === 'comma_separated_plain_text') {
        return { ...condition, values: condition.values.join(',') };
      }
      return {
        ...condition,
        query_operator: condition.query_operator || 'and',
        values: [...getConditionDropdownValues(condition.attribute_key)].filter(
          item => [...condition.values].includes(item.id)
        ),
      };
    });
  };

  const getActionDropdownValues = type => {
    return getActionOptions({
      agents: agents.value,
      labels: labels.value,
      teams: teams.value,
      slaPolicies: slaPolicies.value,
      languages,
      type,
    });
  };

  const generateActionsArray = (action, automationActionTypes) => {
    const params = action.action_params;
    const inputType = automationActionTypes.find(
      item => item.key === action.action_name
    ).inputType;
    if (inputType === 'multi_select' || inputType === 'search_select') {
      return [...getActionDropdownValues(action.action_name)].filter(item =>
        [...params].includes(item.id)
      );
    }
    if (inputType === 'team_message') {
      return {
        team_ids: [...getActionDropdownValues(action.action_name)].filter(
          item => [...params[0].team_ids].includes(item.id)
        ),
        message: params[0].message,
      };
    }
    return [...params];
  };

  const manifestActions = (automation, automationActionTypes) => {
    return automation.actions.map(action => ({
      ...action,
      action_params: action.action_params.length
        ? generateActionsArray(action, automationActionTypes)
        : [],
    }));
  };

  const formatAutomation = (
    automation,
    allCustomAttributes,
    automationTypes,
    automationActionTypes
  ) => {
    return {
      ...automation,
      conditions: manifestConditions(
        automation,
        allCustomAttributes,
        automationTypes
      ),
      actions: manifestActions(automation, automationActionTypes),
    };
  };

  const manifestCustomAttributes = automationTypes => {
    const conversationCustomAttributesRaw = getters[
      'attributes/getAttributesByModel'
    ].value('conversation_attribute');
    const contactCustomAttributesRaw =
      getters['attributes/getAttributesByModel'].value('contact_attribute');

    const conversationCustomAttributeTypes = generateCustomAttributeTypes(
      conversationCustomAttributesRaw,
      'conversation_attribute'
    );
    const contactCustomAttributeTypes = generateCustomAttributeTypes(
      contactCustomAttributesRaw,
      'contact_attribute'
    );

    const manifestedCustomAttributes = generateCustomAttributes(
      conversationCustomAttributeTypes,
      contactCustomAttributeTypes,
      t('AUTOMATION.CONDITION.CONVERSATION_CUSTOM_ATTR_LABEL'),
      t('AUTOMATION.CONDITION.CONTACT_CUSTOM_ATTR_LABEL')
    );

    automationTypes.message_created.conditions.push(
      ...manifestedCustomAttributes
    );
    automationTypes.conversation_created.conditions.push(
      ...manifestedCustomAttributes
    );
    automationTypes.conversation_updated.conditions.push(
      ...manifestedCustomAttributes
    );
    automationTypes.conversation_opened.conditions.push(
      ...manifestedCustomAttributes
    );
  };

  return {
    agents,
    campaigns,
    contacts,
    inboxes,
    labels,
    teams,
    slaPolicies,
    booleanFilterOptions,
    statusFilterOptions,
    onEventChange,
    getAttributes,
    getInputType,
    getOperators,
    getAutomationType,
    getCustomAttributeType,
    getConditionDropdownValues,
    appendNewCondition,
    appendNewAction,
    removeFilter,
    removeAction,
    resetFilter,
    showActionInput,
    resetAction,
    formatAutomation,
    getActionDropdownValues,
    manifestCustomAttributes,
  };
}
