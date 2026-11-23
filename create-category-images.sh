
#!/bin/bash

mkdir -p frontend/images/categories

create_image() {
    filename="$1"
    label="$2"
    background="$3"
    accent="$4"

    cat > "frontend/images/categories/${filename}.svg" <<EOF
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <rect width="600" height="600" fill="${background}"/>
  <circle cx="300" cy="245" r="125" fill="${accent}" opacity="0.25"/>
  <path d="M300 330 C210 260 230 175 300 145 C370 175 390 260 300 330Z" fill="${accent}"/>
  <path d="M300 320 Q300 245 300 165" stroke="#ffffff" stroke-width="9" fill="none"/>
  <text x="300" y="435" text-anchor="middle" font-family="Arial" font-size="36" font-weight="bold" fill="#244b36">${label}</text>
  <text x="300" y="480" text-anchor="middle" font-family="Arial" font-size="20" fill="#526b50">FarmFresh Organic</text>
</svg>
EOF
}

create_image honey "Pure Honey" "#fff2d5" "#c58b25"
create_image ghee "Pure Ghee" "#fff0c2" "#d6a62d"
create_image pickles "Homemade Pickles" "#f8dfd1" "#a94d32"
create_image oils "Natural Oils" "#f3edcf" "#9b9a36"
create_image spices "Organic Spices" "#f3ded4" "#a54b32"
create_image snacks "Healthy Snacks" "#f4e6d0" "#a87935"
create_image grains-pulses "Grains & Pulses" "#e9e5d4" "#78864b"
create_image jaggery-sweeteners "Natural Jaggery" "#eee0d1" "#93603c"

echo "Eight category images created successfully."

