/** Load legacy jQuery / Bootstrap / theme scripts (from public/front_assets). */
export function useLegacyVendorScripts() {
  onMounted(() => {
    const mount = document.getElementById('scripts')
    if (!mount) {
      return
    }
    const src = [
      '/front_assets/vendor/jquery/jquery.min.js',
      '/front_assets/vendor/jquery/jquery-migrate.min.js',
      '/front_assets/vendor/bootstrap/js/bootstrap.min.js',
      '/front_assets/vendor/easing/easing.min.js',
      '/front_assets/vendor/php-email-form/validate.js',
      '/front_assets/vendor/isotope/isotope.pkgd.min.js',
      '/front_assets/vendor/aos/aos.js',
      '/front_assets/vendor/owlcarousel/owl.carousel.min.js',
      '/front_assets/js/main.js'
    ]
    for (const s of src) {
      const script = document.createElement('script')
      script.src = s
      script.async = false
      mount.appendChild(script)
    }
  })
}
