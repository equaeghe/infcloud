# THE PROBLEM

Baïkal 0.2.7 supplies separate principal urls for CardDAV connections and
CalDAV connections. InfCloud 0.12.0 requires a single principal url in its
configuration that provides access to both CardDDAV and CalDAV resources.


# THE WORKAROUND

The file `calcard.php` in this directory is a user-made merger of the files
`cal.php` and `card.php` located in the root of the Baïkal directory tree. To
use it, copy it there as well and use it as the others.

Concretely, use

    href: 'https://<your.Baïkal/location>/calcard.php/principals/'

in your `config.js`.


# NOTE

Use at your own risk: this has been used successfully, but has not received
a blessing from the Baïkal developers (neither have they spoken against it).
