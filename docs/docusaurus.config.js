// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require("prism-react-renderer/themes/github");
const darkCodeTheme = require("prism-react-renderer/themes/dracula");
const { remarkCodeHike } = require("@code-hike/mdx");

const isProduction = process.env.NODE_ENV === "production";

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "AxieStudio Documentation",
  tagline:
    "AxieStudio is a low-code app builder for RAG and multi-agent AI applications.",
  favicon: "img/favicon.ico",
  url: "https://docs.axiestudio.se/",
  baseUrl: process.env.BASE_URL ? process.env.BASE_URL : "/",
  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",
  onBrokenAnchors: "warn",
  organizationName: "axiestudio",
  projectName: "axiestudio",
  trailingSlash: false,
  staticDirectories: ["static"],
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },
  headTags: [
    {
      tagName: "link",
      attributes: {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Sora:wght@550;600&display=swap",
      },
    },
    {
      tagName: "link",
      attributes: {
        rel: "icon",
        type: "image/x-icon",
        href: "/img/favicon.ico",
      },
    },
    {
      tagName: "link",
      attributes: {
        rel: "icon",
        type: "image/png",
        href: "/img/favicon.png",
      },
    },
    {
      tagName: "link",
      attributes: {
        rel: "apple-touch-icon",
        href: "/img/axiestudio-logo.jpg",
      },
    },
    ...(isProduction
      ? [
          // Ketch consent management script
          {
            tagName: "script",
            attributes: {},
            innerHTML: `!function(){window.semaphore=window.semaphore||[],window.ketch=function(){window.semaphore.push(arguments)};var e=document.createElement("script");e.type="text/javascript",e.src="https://global.ketchcdn.com/web/v3/config/datastax/langflow_org_web/boot.js",e.defer=e.async=!0,document.getElementsByTagName("head")[0].appendChild(e)}();`,
          },
          // Ketch jurisdiction dynamic link and GA4 consent tracking
          {
            tagName: "script",
            attributes: {
              defer: "true",
            },
            innerHTML: `
          ;(function () {
            const onKetchConsentGtagTrack = (consent) => {
              if (window.gtag &&
                  consent.purposes &&
                  'analytics' in consent.purposes &&
                  'targeted_advertising' in consent.purposes
              ) {
                const analyticsString = consent.purposes.analytics === true ? 'granted' : 'denied'
                const targetedAdsString = consent.purposes.targeted_advertising === true ? 'granted' : 'denied'
                const gtagObject = {
                  analytics_storage: analyticsString,
                  ad_personalization: targetedAdsString,
                  ad_storage: targetedAdsString,
                  ad_user_data: targetedAdsString,
                }
                window.gtag('consent', 'update', gtagObject)
              }
            }
            if (window.ketch) {
              window.ketch('on', 'consent', onKetchConsentGtagTrack)
            }
          })()
        `,
          },
        ]
      : []),
  ],

  presets: [
    [
      "docusaurus-preset-openapi",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        api: {
          path: "openapi.json", // Path to your OpenAPI file
          routeBasePath: "/api", // The base URL for your API docs
        },
        docs: {
          routeBasePath: "/", // Serve the docs at the site's root
          sidebarPath: require.resolve("./sidebars.js"), // Use sidebars.js file
          sidebarCollapsed: true,
          beforeDefaultRemarkPlugins: [
            [
              remarkCodeHike,
              {
                theme: "github-dark",
                showCopyButton: true,
                lineNumbers: true,
              },
            ],
          ],
        },
        sitemap: {
          // https://docusaurus.io/docs/api/plugins/@docusaurus/plugin-sitemap
          // https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
          lastmod: null,
          changefreq: null,
          priority: null,
          ignorePatterns: ["/preferences"],
        },
        gtag: {
          trackingID: "G-SLQFLQ3KPT",
        },
        blog: false,
        theme: {
          customCss: [
            require.resolve("@code-hike/mdx/styles.css"),
            require.resolve("./css/custom.css"),
            require.resolve("./css/docu-notion-styles.css"),
            require.resolve(
              "./css/gifplayer.css"
              //"./node_modules/react-gif-player/dist/gifplayer.css" // this gave a big red compile warning which is seaming unrelated "  Replace Autoprefixer browsers option to Browserslist config..."
            ),
          ],
        },
      }),
    ],
  ],
  plugins: [
    ["docusaurus-node-polyfills", { excludeAliases: ["console"] }],
    "docusaurus-plugin-image-zoom",
    ["./src/plugins/segment", { segmentPublicWriteKey: process.env.SEGMENT_PUBLIC_WRITE_KEY, allowedInDev: true }],
    ["./src/plugins/scroll-tracking", {
      segmentPublicWriteKey: process.env.SEGMENT_PUBLIC_WRITE_KEY,
      allowedInDev: true,
      selectors: [
        {
          selector: 'h1, h2, h3, h4, h5, h6',
          eventName: 'Docs.langflow.org - Heading Viewed',
          properties: {
            element_type: 'heading'
          }
        },
        {
          selector: '.ch-codeblock',
          eventName: 'Docs.langflow.org - Codeblock Viewed',
          properties: {
            element_type: 'code',
            language: 'helper:codeLanguage'
          }
        }
      ]
    }],
    [
      "@docusaurus/plugin-client-redirects",
      {
        redirects: [
          {
            to: "/",
            from: [
              "/whats-new-a-new-chapter-axiestudio",
              "/👋 Welcome-to-AxieStudio",
              "/getting-started-welcome-to-axiestudio",
              "/guides-new-to-llms",
            ],
          },
          {
            to: "/get-started-installation",
            from: [
              "/getting-started-installation",
              "/getting-started-common-installation-issues",
            ],
          },
          {
            to: "/get-started-quickstart",
            from: "/getting-started-quickstart",
          },
          {
            to: "concepts-overview",
            from: [
              "/workspace-overview",
              "/365085a8-a90a-43f9-a779-f8769ec7eca1",
              "/My-Collection",
              "/workspace",
              "/settings-project-general-settings",
            ],
          },
          {
            to: "/concepts-components",
            from: ["/components", "/components-overview"],
          },
          {
            to: "/configuration-global-variables",
            from: "/settings-global-variables",
          },
          {
            to: "/concepts-playground",
            from: [
              "/workspace-playground",
              "/workspace-logs",
              "/guides-chat-memory",
            ],
          },
          {
            to: "/data-types",
            from: ["/guides-data-message", "/configuration-objects"],
          },
          {
            to: "/concepts-flows",
            from: [
              "/travel-planning-agent",
              "/starter-projects-travel-planning-agent",
              "/tutorials-travel-planning-agent",
              "/starter-projects-dynamic-agent/",
              "/simple-agent",
              "/math-agent",
              "/starter-projects-simple-agent",
              "/starter-projects-math-agent",
              "/tutorials-math-agent",
              "/sequential-agent",
              "/starter-projects-sequential-agent",
              "/tutorials-sequential-agent",
              "/memory-chatbot",
              "/starter-projects-memory-chatbot",
              "/tutorials-memory-chatbot",
              "/financial-report-parser",
              "/document-qa",
              "/starter-projects-document-qa",
              "/tutorials-document-qa",
              "/blog-writer",
              "/starter-projects-blog-writer",
              "/tutorials-blog-writer",
              "/basic-prompting",
              "/starter-projects-basic-prompting",
              "/vector-store-rag",
              "/starter-projects-vector-store-rag",
            ],
          },
          {
            to: "/components-vector-stores",
            from: "/components-rag",
          },
          {
            to: "/api-keys-and-authentication",
            from: [
              "/configuration-api-keys",
              "/configuration-authentication",
              "/configuration-security-best-practices",
              "/Configuration/configuration-security-best-practices",
            ],
          },
          {
            to: "/environment-variables",
            from: [
              "/configuration-auto-saving",
              "/Configuration/configuration-auto-saving",
              "/configuration-backend-only",
              "/Configuration/configuration-backend-only",
            ],
          },
          {
            to: "/concepts-publish",
            from: [
              "/concepts-api",
              "/workspace-api",
            ],
          },
          {
            to: "/components-custom-components",
            from: "/components/custom",
          },
          {
            to: "/components-bundle-components",
            from: "/components-loaders",
          },
          {
            to: "/mcp-server",
            from: "/integrations-mcp",
          },
          {
            to: "/integrations-nvidia-g-assist",
            from: "/integrations-nvidia-system-assist",
          },
          {
            to: "/deployment-kubernetes-dev",
            from: "/deployment-kubernetes",
          },
          {
            to: "/contributing-github-issues",
            from: "/contributing-github-discussions",
          },
          {
            to: "/agents",
            from: "/agents-tool-calling-agent-component",
          },
          {
            to: "/concepts-publish",
            from: "/embedded-chat-widget",
          },
          {
            to: "/bundles-google",
            from: "/integrations-setup-google-oauth-langflow",
          },
          {
            to: "/bundles-vertexai",
            from: "/integrations-setup-google-cloud-vertex-ai-langflow",
          },
          {
            to: "/develop-application",
            from: "/develop-overview",
          },
          {
            to: "/data-types",
            from: "/concepts-objects",
          },
          // add more redirects like this
          // {
          //   to: '/docs/anotherpage',
          //   from: ['/docs/legacypage1', '/docs/legacypage2'],
          // },
        ],
      },
    ],
    // ....
    async function myPlugin(context, options) {
      return {
        name: "docusaurus-tailwindcss",
        configurePostCss(postcssOptions) {
          // Appends TailwindCSS and AutoPrefixer.
          postcssOptions.plugins.push(require("tailwindcss"));
          postcssOptions.plugins.push(require("autoprefixer"));
          return postcssOptions;
        },
      };
    },
  ],
  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        hideOnScroll: true,
        logo: {
          alt: "AxieStudio",
          src: "https://scontent-arn2-1.xx.fbcdn.net/v/t39.30808-6/499498872_122132145854766980_5268724011023190696_n.jpg?_nc_cat=109&ccb=1-7&_nc_sid=6ee11a&_nc_ohc=Hw_2sNDib2oQ7kNvwGQIi5q&_nc_oc=AdlCiI5jtyM3BRWqWdGqznyy35IpJWshinC9KrGHZ3tMUUPu7tDEgyLjyKFRFM9GdSk&_nc_zt=23&_nc_ht=scontent-arn2-1.xx&_nc_gid=cNNYzpqEimVEWfBFSbmq1g&oh=00_AfWYTO1sri9clmuAx07T8OKswQuUNU9O-hLntZqM0J92og&oe=68AF7299",
          srcDark: "https://scontent-arn2-1.xx.fbcdn.net/v/t39.30808-6/499498872_122132145854766980_5268724011023190696_n.jpg?_nc_cat=109&ccb=1-7&_nc_sid=6ee11a&_nc_ohc=Hw_2sNDib2oQ7kNvwGQIi5q&_nc_oc=AdlCiI5jtyM3BRWqWdGqznyy35IpJWshinC9KrGHZ3tMUUPu7tDEgyLjyKFRFM9GdSk&_nc_zt=23&_nc_ht=scontent-arn2-1.xx&_nc_gid=cNNYzpqEimVEWfBFSbmq1g&oh=00_AfWYTO1sri9clmuAx07T8OKswQuUNU9O-hLntZqM0J92og&oe=68AF7299",
          width: 40,
          height: 40,
        },
        items: [
          // right
          {
            position: "right",
            href: "https://github.com/axiestudio/axiestudio",
            className: "header-github-link",
            target: "_blank",
            rel: null,
            'data-event': 'Docs.axiestudio.se - Social Clicked',
            'data-platform': 'github'
          },
          {
            position: "right",
            href: "https://axiestudio.se",
            className: "header-website-link",
            target: "_blank",
            rel: null,
            'data-event': 'Docs.axiestudio.se - Social Clicked',
            'data-platform': 'website'
          },
          {
            position: "right",
            href: "https://www.facebook.com/p/Axie-Studio-61573009403109/",
            className: "header-facebook-link",
            target: "_blank",
            rel: null,
            'data-event': 'Docs.axiestudio.se - Social Clicked',
            'data-platform': 'facebook'
          },
        ],
      },
      colorMode: {
        defaultMode: "light",
        /* Allow users to chose light or dark mode. */
        disableSwitch: false,
        /* Respect user preferences, such as low light mode in the evening */
        respectPrefersColorScheme: true,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
      zoom: {
        selector: ".markdown :not(a) > img:not(.no-zoom)",
        background: {
          light: "rgba(240, 240, 240, 0.9)",
        },
        config: {},
      },
      docs: {
        sidebar: {
          hideable: false,
        },
      },
      footer: {
        logo: {
          alt: "AxieStudio",
          src: "img/axiestudio-logo.jpg",
          srcDark: "img/axiestudio-logo.jpg",
          width: 60,
          height: 60,
        },
        links: [
          {
            title: null,
            items: [
              {
                html: `<div class="footer-links">
                  <span>© ${new Date().getFullYear()} AxieStudio</span>
                  <span id="preferenceCenterContainer"> ·&nbsp; <a href="https://axiestudio.se">Manage Privacy Choices</a></span>
                  </div>`,
              },
            ],
          },
        ],
      },

    }),
};

module.exports = config;
