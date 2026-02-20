import axios from "axios";
import * as cheerio from "cheerio";
import { TechStackData } from "../types";

export class TechStackDetector {
  /**
   * Detect tech stack from website HTML
   */
  static async detectTechStack(url: string): Promise<TechStackData> {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      const html = response.data;
      const $ = cheerio.load(html);

      const techStack: TechStackData = {};

      // Platform detection
      techStack.isShopify = this.detectShopify($, html);
      techStack.isWooCommerce = this.detectWooCommerce($, html);
      techStack.isBigCommerce = this.detectBigCommerce($, html);

      // Email/Marketing detection
      techStack.klaviyoDetected = this.detectKlaviyo(html);
      techStack.mailchimpDetected = this.detectMailchimp(html);

      // Analytics detection
      techStack.googleAnalytics = this.detectGoogleAnalytics(html);
      techStack.mixpanelDetected = this.detectMixpanel(html);
      techStack.amplitudeDetected = this.detectAmplitude(html);

      // Ads detection
      techStack.metaPixelDetected = this.detectMetaPixel(html);
      techStack.googleTagManager = this.detectGTM(html);

      // Custom techs
      const customTechs = this.detectCustomTechs($, html);
      if (customTechs.length > 0) {
        techStack.customTechs = customTechs;
      }

      return techStack;
    } catch (error) {
      console.error(`Error detecting tech stack for ${url}:`, error);
      return {};
    }
  }

  /**
   * Detect Shopify
   */
  private static detectShopify($: cheerio.CheerioAPI, html: string): boolean {
    // Check for Shopify imports, scripts, theme info
    if (html.includes("Shopify.")) return true;
    if (html.includes("myshopify.com")) return true;
    if ($('script[src*="shopify"]').length > 0) return true;
    if ($('link[href*="shopify"]').length > 0) return true;
    if (html.includes("Shopify.SharedModel")) return true;
    if (html.includes("CDN = \"https://cdn.shopify.com")) return true;

    return false;
  }

  /**
   * Detect WooCommerce
   */
  private static detectWooCommerce($: cheerio.CheerioAPI, html: string): boolean {
    if (html.includes("wc-settings")) return true;
    if (html.includes("_wpnonce")) return true;
    if ($('link[rel*="woocommerce"]').length > 0) return true;
    if ($('body.woocommerce').length > 0) return true;
    if (html.includes("WC_VERSION")) return true;

    return false;
  }

  /**
   * Detect BigCommerce
   */
  private static detectBigCommerce($: cheerio.CheerioAPI, html: string): boolean {
    if (html.includes("bigcommerce.com")) return true;
    if ($('script[src*="bigcommerce"]').length > 0) return true;
    if (html.includes("stencil")) return true;

    return false;
  }

  /**
   * Detect Klaviyo
   */
  private static detectKlaviyo(html: string): boolean {
    // Klaviyo form embeds, scripts
    if (html.includes("klaviyo.com")) return true;
    if (html.includes("_kenshoo_pixel")) return true;
    if (html.includes("metorik")) return true;
    if (html.includes("_leady_")) return true;
    if (html.match(/www\.klaviyo\.com.*embed/)) return true;
    if (html.includes("klaviyoSubscribeFormListener")) return true;

    return false;
  }

  /**
   * Detect Mailchimp
   */
  private static detectMailchimp(html: string): boolean {
    if (html.includes("cdn-cgi.com") && html.includes("mailchimp")) return true;
    if (html.includes("s3.amazonaws.com/downloads.mailchimp.com")) return true;
    if (html.includes("chimpstatic")) return true;

    return false;
  }

  /**
   * Detect Google Analytics
   */
  private static detectGoogleAnalytics(html: string): boolean {
    if (html.includes("google-analytics.com")) return true;
    if (html.includes("googletagmanager.com") && html.includes("UA-")) return true;
    if (html.match(/\/\/ga\./)) return true;

    return false;
  }

  /**
   * Detect Mixpanel
   */
  private static detectMixpanel(html: string): boolean {
    return html.includes("mixpanel.com") || html.includes("dec.mixpanel.com");
  }

  /**
   * Detect Amplitude
   */
  private static detectAmplitude(html: string): boolean {
    return html.includes("amplitude.com");
  }

  /**
   * Detect Meta Pixel (Facebook)
   */
  private static detectMetaPixel(html: string): boolean {
    if (html.includes("facebook.com/tr")) return true;
    if (html.includes("fbq('init'")) return true;
    if (html.match(/fbq\("track"/)) return true;
    if (html.includes("fbevents.js")) return true;

    return false;
  }

  /**
   * Detect Google Tag Manager
   */
  private static detectGTM(html: string): boolean {
    if (html.includes("gtag.js")) return true;
    if (html.includes("googletagmanager.com/gtag")) return true;
    if (html.includes("GTM-")) return true;

    return false;
  }

  /**
   * Detect other notable tech stacks
   */
  private static detectCustomTechs($: cheerio.CheerioAPI, html: string): string[] {
    const techs: Set<string> = new Set();

    // Payment processors
    if (html.includes("stripe.com")) techs.add("stripe");
    if (html.includes("paypal.com")) techs.add("paypal");
    if (html.includes("sqspcdn.com")) techs.add("squarespace");

    // CMS/Builders
    if (html.includes("webflow.io")) techs.add("webflow");
    if (html.includes("wix.com")) techs.add("wix");
    if (html.includes("wordpress.com") || html.includes("wp-content")) techs.add("wordpress");

    // Customer support
    if (html.includes("intercom.io")) techs.add("intercom");
    if (html.includes("freshdesk")) techs.add("freshdesk");
    if (html.includes("zendesk")) techs.add("zendesk");
    if (html.includes("drift.com")) techs.add("drift");

    // Livestream/Social
    if (html.includes("twitch.tv")) techs.add("twitch");
    if (html.includes("youtube.com")) techs.add("youtube");

    // Video hosting
    if (html.includes("vimeo.com")) techs.add("vimeo");
    if (html.includes("vidyard")) techs.add("vidyard");

    // A/B testing
    if (html.includes("optimizely")) techs.add("optimizely");
    if (html.includes("unbounce")) techs.add("unbounce");

    // Tracking/CDN
    if (html.includes("cloudflare.com")) techs.add("cloudflare");
    if (html.includes("akamai")) techs.add("akamai");

    // CRM
    if (html.includes("hubspot")) techs.add("hubspot");
    if (html.includes("salesforce")) techs.add("salesforce");

    return Array.from(techs);
  }
}
