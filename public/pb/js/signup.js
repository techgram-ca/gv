/* Signup Form Submission Function */
async function submitSignup(payload, buttonText, submitButton) {
    try {
        const res = await fetch('/api/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })

        const data = await res.json()

        if (!data.success) {
            errorContainer.textContent = data.message || "An error occurred.";
            errorContainer.classList.remove("hidden");


            return
        } else {
            signupForm.reset();
            if (data.success && data.checkout_url) {
                // Redirect user to Stripe Checkout
                window.location.href = data.checkout_url;
            } else {

                window.location.href = "/thank-you";
            }
        }

    } catch (e) {
        errorContainer.textContent = "An error occurred.";
        errorContainer.classList.remove("hidden");
        // Re-enable button and restore text
        submitButton.disabled = false;
        submitButton.textContent = buttonText;

    }
}
/* End of Signup Form Submission Function */

/* Signup Form Submission Logic */
const signupForm = document.getElementById("signupForm");
signupForm.addEventListener("submit", (e) => {
    e.preventDefault();
    errorContainer.classList.add("hidden");
    errorContainer.textContent = "";
    const submitButton = e.submitter; // button clicked
    const originalText = submitButton.textContent;

    submitButton.disabled = true;
    submitButton.textContent = "Processing...";

    const action = e.submitter.dataset.action;
    const deliveryMethod = 'email';
    const emailValue = signupForm.email?.value || null;

    submitSignup({
        path_id: signupForm.path?.value || '',
        name: signupForm.name?.value || '',
        email: emailValue,
        phone: null,
        delivery_method: deliveryMethod,
        subscription_type: action === 'paid' ? 'paid' : 'free',
    }, originalText, submitButton);
});
/* End of Signup Form Submission Logic */

/* FAQ Toggle Logic */
function toggleFaq(button) {
    const faqItem = button.parentElement;
    const isActive = faqItem.classList.contains('active');

    // Close all other FAQs
    document.querySelectorAll('.faq-item').forEach(item => {
        item.classList.remove('active');
    });

    // Toggle current FAQ
    if (!isActive) {
        faqItem.classList.add('active');
    }
}
/* End of FAQ Toggle Logic */

/* Path Selection Logic */
document.addEventListener('DOMContentLoaded', function() {
    const pathCards = document.querySelectorAll('.begin-button');
    const signupSection = document.getElementById('signup');
    const pathSelect = document.querySelector('select[name="path"]');

    pathCards.forEach(card => {
        card.addEventListener('click', function() {
            pathCards.forEach(c => c.classList.remove('ring-2', 'ring-primary'));
            this.classList.add('ring-2', 'ring-primary');

            // ✅ select path in dropdown
            const pathId = this.dataset.pathId;
            if (pathId) {
                pathSelect.value = pathId;
                pathSelect.dispatchEvent(new Event('change'));
            }

            setTimeout(() => {
                signupSection.scrollIntoView({
                    behavior: 'smooth'
                });
            }, 300);
        });
    });
});
/* End of Path Selection Logic */

/* Mobile Menu Logic */
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
    mobileMenuBtn.addEventListener('click', function() {
        const isOpen = mobileMenu.style.transform === 'translateY(0px)';
        if (isOpen) {
            mobileMenu.style.transform = 'translateY(-100%)';
            mobileMenu.style.opacity = '0';
            setTimeout(() => {
                mobileMenu.style.visibility = 'hidden';
            }, 300);
            mobileMenuBtn.querySelector('i').className = 'ri-menu-line text-xl';
        } else {
            mobileMenu.style.visibility = 'visible';
            mobileMenu.style.transform = 'translateY(0px)';
            mobileMenu.style.opacity = '1';
            mobileMenuBtn.querySelector('i').className = 'ri-close-line text-xl';
        }
    });
    mobileNavLinks.forEach(link => {
        link.addEventListener('click', function() {
            mobileMenu.style.transform = 'translateY(-100%)';
            mobileMenu.style.opacity = '0';
            setTimeout(() => {
                mobileMenu.style.visibility = 'hidden';
            }, 300);
            mobileMenuBtn.querySelector('i').className = 'ri-menu-line text-xl';
        });
    });
});
/* End of Mobile Menu Logic */

/* Smooth Scrolling Logic */
document.addEventListener('DOMContentLoaded', function() {
    const allNavLinks = document.querySelectorAll('a[href^="#"]');

    allNavLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                const topOffset = 20; // 20px space at top
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - topOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
});
/* End of Smooth Scrolling Logic */

/* Delivery Method Toggle Logic */
/*
const deliveryRadios = document.querySelectorAll(".delivery-radio");
const emailField = document.getElementById("emailField");
const phoneField = document.getElementById("phoneField");

deliveryRadios.forEach(radio => {
    radio.addEventListener("change", () => {
        if (radio.value === "email" && radio.checked) {
            emailField.classList.remove("hidden");
            emailField.querySelector("input").required = true;

            phoneField.classList.add("hidden");
            phoneField.querySelector("input[name='phone']").required = false;
        } else if (radio.value === "sms" && radio.checked) {
            phoneField.classList.remove("hidden");
            phoneField.querySelector("input[name='phone']").required = true;

            emailField.classList.add("hidden");
            emailField.querySelector("input").required = false;
        }
    });
});

// Initialize based on checked radio
const checkedRadio = document.querySelector(".delivery-radio:checked");
if (checkedRadio) {
    checkedRadio.dispatchEvent(new Event("change"));
}
*/
/* End of Delivery Method Toggle Logic */

/* Update Paid Button Text Based on Selected Path */
const pathSelect = document.querySelector('select[name="path"]');
const paidButton = document.querySelector('button[data-action="paid"]');

pathSelect.addEventListener('change', () => {
    const selectedOption = pathSelect.options[pathSelect.selectedIndex];
    const price = selectedOption.dataset.price;

    if (price) {
        paidButton.textContent = `Support & Subscribe (${price})`;
    } else {
        paidButton.textContent = 'Support & Subscribe';
    }
});
/* End of Delivery Method Toggle Logic */

/* Delivery method radio button styling */
/*
document.addEventListener('DOMContentLoaded', function() {
    const radioInputs = document.querySelectorAll('.delivery-radio');
    radioInputs.forEach(radio => {
        radio.addEventListener('change', function() {
            radioInputs.forEach(r => {
                const dot = r.parentElement.querySelector('.radio-dot');
                const custom = r.parentElement.querySelector('.radio-custom');
                if (r.checked) {
                    dot.style.opacity = '1';
                    custom.style.borderColor = '#000000';
                } else {
                    dot.style.opacity = '0';
                    custom.style.borderColor = '#d1d5db';
                }
            });
        });
    });
    radioInputs[0].dispatchEvent(new Event('change'));
});
*/
/* End of Custom Radio Button Logic */

/* Terms and Conditions Checkbox Logic */
const termsCheckbox = document.getElementById('termsCheckbox');
  const submitButtons = document.querySelectorAll('#signupForm button[type="submit"]');

  function toggleSubmitButtons() {
    submitButtons.forEach(btn => {
      btn.disabled = !termsCheckbox.checked;
    });
  }

  termsCheckbox.addEventListener('change', toggleSubmitButtons);
  /* End of Terms and Conditions Checkbox Logic */