# ProNax Commercial License

**Copyright (c) 2026. All rights reserved.**

## Commercial Single-End Product License

This license agreement ("License") governs your use of the ProNax software codebase ("Software"). By purchasing, downloading, installing, or using the Software, you agree to be bound by the terms of this License.

## License Grant

Subject to the terms and conditions of this License, the licensor grants you a non-exclusive, non-transferable, non-sublicensable license to:

1. **Use** the Software in a single end product that you or your client create
2. **Modify** the Software to suit your needs
3. **Distribute** the compiled/obfuscated production build of the Software as part of your single end product
4. **Make copies** of the Software for backup purposes only

## Restrictions

**Reselling, distributing, sublicensing, or sharing this codebase or any portion thereof without explicit written permission is strictly prohibited.**

You may NOT:

1. **Resell or redistribute** the source code, modified or unmodified, as a standalone product or as part of a template/theme marketplace
2. **Sublicense** the Software to any third party
3. **Share** the source code publicly (including GitHub, GitLab, or other code repositories)
4. **Use** the Software in multiple end products without purchasing additional licenses
5. **Remove or alter** any copyright notices, license headers, or proprietary notices
6. **Reverse engineer** the compiled/obfuscated production build for the purpose of extracting source code
7. **Claim ownership** of the original Software or any portion thereof
8. **Use** the Software for any illegal or unauthorized purpose

## License Key and Validation

The Software includes a license validation system that:

1. **Requires a valid license key** to function
2. **Binds the license** to specific hardware configurations (HWID)
3. **May restrict usage** to specific domains or IP addresses
4. **Enforces expiration dates** based on your license term
5. **Validates licenses** through offline JWT verification and optional online checks

## Security Features

The Software is protected by multiple security layers to prevent unauthorized use and distribution:

### Code Protection
- **JavaScript Obfuscation**: Production builds are heavily obfuscated using advanced techniques including control flow flattening, string encryption, and dead code injection
- **No Source Maps**: Source maps are disabled in production to prevent reverse engineering
- **Console Removal**: All console statements are removed in production builds
- **Build-time Encryption**: Sensitive constants and API endpoints are encrypted at build time
- **Self-Defending Code**: Code includes anti-debugging and anti-tampering mechanisms

### License Enforcement
- **Hardware ID Binding**: Licenses are bound to specific hardware configurations using browser fingerprinting
- **Domain/IP Restrictions**: Licenses can be restricted to specific domains or IP addresses
- **Online Verification**: Optional server-side license verification for enhanced security
- **JWT Token Validation**: Licenses use cryptographically signed JWT tokens
- **Automatic Expiration**: Licenses automatically expire after the specified term

### Anti-Piracy Measures
- **Reverse Engineering Protection**: Multiple layers of obfuscation and encryption make reverse engineering extremely difficult
- **Tamper Detection**: Code includes self-integrity checks to detect modifications
- **Debug Protection**: Anti-debugging mechanisms prevent analysis of running code
- **License Revocation**: Licenses can be remotely revoked if terms are violated

**Any attempt to bypass, remove, or circumvent these security measures is a violation of this License and may result in immediate termination and legal action.**

## License Transfer

You may transfer your license to another party only if:

1. You provide written notice to the licensor
2. The transferee agrees to be bound by the terms of this License
3. You permanently cease all use of the Software
4. The transfer includes all copies of the Software in your possession

## Support and Updates

1. **Support** is provided as specified in your purchase agreement
2. **Updates** may be provided at the licensor's discretion
3. **License keys** may be updated to enable new features or extend expiration
4. **Beta versions** may have additional restrictions

## Warranty Disclaimer

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF, OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Termination

This License is effective until terminated. Your rights under this License will terminate automatically without notice if you fail to comply with any of its terms. Upon termination, you must cease all use of the Software and destroy all copies in your possession.

## Governing Law

This License shall be governed by and construed in accordance with the laws of the jurisdiction in which the licensor is located, without regard to its conflict of law provisions.

## Contact Information

For licensing inquiries, support, or to report violations:

- **Email:** support@pronax.com
- **Website:** https://pronax.com

---

**This License is a legal agreement between you and the licensor. By using the Software, you acknowledge that you have read, understood, and agree to be bound by the terms and conditions of this License.**
