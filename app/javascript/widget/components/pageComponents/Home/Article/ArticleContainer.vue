<script setup>
import { computed, onMounted } from 'vue';
import ArticleBlock from 'widget/components/pageComponents/Home/Article/ArticleBlock.vue';
import ArticleCardSkeletonLoader from 'widget/components/pageComponents/Home/Article/SkeletonLoader.vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useStore } from 'dashboard/composables/store';
import { useMapGetter } from 'dashboard/composables/store.js';
import { useDarkMode } from 'widget/composables/useDarkMode';

const store = useStore();
const router = useRouter();
const i18n = useI18n();
const { prefersDarkMode } = useDarkMode();

const portal = computed(() => window.chatwootWebChannel.portal);

const widgetColor = useMapGetter('appConfig/getWidgetColor');

const popularArticles = useMapGetter('article/popularArticles');
const articleUiFlags = useMapGetter('article/uiFlags');

const locale = computed(() => {
  const { locale: selectedLocale } = i18n;
  const {
    allowed_locales: allowedLocales,
    default_locale: defaultLocale = 'en',
  } = portal.value.config;
  // IMPORTANT: Variation strict locale matching, Follow iso_639_1_code
  // If the exact match of a locale is available in the list of portal locales, return it
  // Else return the default locale. Eg: `es` will not work if `es_ES` is available in the list
  if (allowedLocales.includes(selectedLocale)) {
    return locale;
  }
  return defaultLocale;
});

const fetchArticles = () => {
  if (portal.value && !popularArticles.value.length) {
    store.dispatch('article/fetch', {
      slug: portal.value.slug,
      locale: locale.value,
    });
  }
};

const openArticleInArticleViewer = link => {
  const params = new URLSearchParams({
    show_plain_layout: 'true',
    theme: prefersDarkMode.value ? 'dark' : 'light',
  });

  // Combine link with query parameters
  const linkToOpen = `${link}?${params.toString()}`;
  router.push({ name: 'article-viewer', query: { link: linkToOpen } });
};

const viewAllArticles = () => {
  const {
    portal: { slug },
  } = window.chatwootWebChannel;
  openArticleInArticleViewer(`/hc/${slug}/${locale.value}`);
};

const hasArticles = computed(
  () =>
    !articleUiFlags.value.isFetching &&
    !articleUiFlags.value.isError &&
    !!popularArticles.value.length
);
onMounted(() => fetchArticles());
</script>

<template>
  <div
    class="flex flex-col gap-3 w-full shadow outline-1 outline outline-n-container rounded-xl bg-n-background dark:bg-n-solid-2 px-5 py-4"
  >
    <div class="flex items-center justify-between gap-2">
      <div class="flex flex-col gap-1">
        <div class="font-medium text-n-slate-12">
          {{ $t('PORTAL.TITLE') }}
        </div>
        <div class="text-n-slate-11">
          {{ $t('PORTAL.SUBTITLE') }}
        </div>
      </div>
      <div class="flex" />
    </div>
    <a
      :href="'https://' + portal.custom_domain"
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex items-center gap-1 font-medium text-n-slate-12"
      :style="{ color: widgetColor }"
    >
      <span>{{ $t('PORTAL.LINK') }}</span>
      <i class="i-lucide-chevron-right size-5 mt-px" />
    </a>
  </div>

  <div
    v-if="portal && (articleUiFlags.isFetching || !!popularArticles.length)"
    class="w-full shadow outline-1 outline outline-n-container rounded-xl bg-n-background dark:bg-n-solid-2 px-5 py-4"
  >
    <ArticleBlock
      v-if="hasArticles"
      :articles="popularArticles"
      @view="openArticleInArticleViewer"
      @view-all="viewAllArticles"
    />
    <ArticleCardSkeletonLoader v-if="articleUiFlags.isFetching" />
  </div>
  <div v-else class="hidden" />
</template>
