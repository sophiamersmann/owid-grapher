import React, { useEffect, useState } from "react"
import ReactDOM from "react-dom"
import { faListUl } from "@fortawesome/free-solid-svg-icons/faListUl"
import {
    NewsletterSubscriptionContext,
    NewsletterSubscriptionForm,
} from "./NewsletterSubscription.js"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome/index.js"
import { faSearch } from "@fortawesome/free-solid-svg-icons/faSearch"
import { SiteNavigationTopics } from "./SiteNavigationTopics.js"
import { SiteLogos } from "./SiteLogos.js"
import { CategoryWithEntries } from "@ourworldindata/utils"
import { SiteResources } from "./SiteResources.js"
import { SiteAbout } from "./SiteAbout.js"
import { SiteSearchInput } from "./SiteSearchInput.js"
import { faBars } from "@fortawesome/free-solid-svg-icons/faBars"
import { SiteMobileMenu } from "./SiteMobileMenu.js"
import { SiteNavigationToggle } from "./SiteNavigationToggle.js"
import { faXmark } from "@fortawesome/free-solid-svg-icons/faXmark"
import { faEnvelopeOpenText } from "@fortawesome/free-solid-svg-icons/faEnvelopeOpenText"

export enum NavigationRoots {
    Topics = "topics",
    // Latest = "latest",
    Resources = "resources",
    About = "about",
    Subscribe = "subscribe",
}

export const SiteNavigation = ({ baseUrl }: { baseUrl: string }) => {
    const [activeRoot, setActiveRoot] = React.useState<NavigationRoots | null>(
        NavigationRoots.Subscribe
    )
    const [categorizedTopics, setCategorizedTopics] = useState<
        CategoryWithEntries[]
    >([])
    const [showMobileSearch, setShowMobileSearch] = useState(false)

    const closeOverlay = () => {
        setActiveRoot(null)
    }

    const toggleActiveRoot = (root: NavigationRoots) => {
        if (activeRoot === root) {
            closeOverlay()
        } else {
            setActiveRoot(root)
        }
    }

    const onToggleMobileSearch = () => {
        setShowMobileSearch(!showMobileSearch)
    }

    useEffect(() => {
        const fetchCategorizedTopics = async () => {
            const response = await fetch("/headerMenu.json", {
                method: "GET",
                credentials: "same-origin",
                headers: {
                    Accept: "application/json",
                },
            })
            const json = await response.json()
            setCategorizedTopics(json.categories)
        }
        fetchCategorizedTopics()
    }, [])

    return (
        <>
            {activeRoot && <div className="overlay" onClick={closeOverlay} />}
            <div className="site-navigation">
                <div className="wrapper">
                    <div className="site-navigation-bar">
                        <SiteNavigationToggle
                            isActive={activeRoot !== null}
                            toggle={() =>
                                toggleActiveRoot(NavigationRoots.Topics)
                            }
                            className="mobile-menu-toggle hide-sm-up"
                            dropdown={
                                <SiteMobileMenu
                                    topics={categorizedTopics}
                                    className="hide-sm-up"
                                />
                            }
                        >
                            <FontAwesomeIcon
                                icon={activeRoot !== null ? faXmark : faBars}
                            />
                        </SiteNavigationToggle>
                        <SiteLogos baseUrl={baseUrl} />
                        <nav className="site-primary-links hide-sm-only">
                            <ul>
                                <li>
                                    <SiteNavigationToggle
                                        dropdown={
                                            <SiteNavigationTopics
                                                onClose={closeOverlay}
                                                topics={categorizedTopics}
                                                className="hide-sm-only"
                                            />
                                        }
                                        className="topics"
                                    >
                                        <FontAwesomeIcon
                                            icon={faListUl}
                                            style={{ marginRight: "8px" }}
                                        />
                                        Browse by topic
                                    </SiteNavigationToggle>
                                </li>
                                <li>
                                    <a href="/blog">Latest</a>
                                </li>
                                <li className="toggle-wrapper">
                                    <SiteNavigationToggle
                                        isActive={
                                            activeRoot ===
                                            NavigationRoots.Resources
                                        }
                                        toggle={() =>
                                            toggleActiveRoot(
                                                NavigationRoots.Resources
                                            )
                                        }
                                        dropdown={<SiteResources />}
                                        withCaret={true}
                                    >
                                        Resources
                                    </SiteNavigationToggle>
                                </li>
                                <li className="toggle-wrapper">
                                    <SiteNavigationToggle
                                        isActive={
                                            activeRoot === NavigationRoots.About
                                        }
                                        toggle={() =>
                                            toggleActiveRoot(
                                                NavigationRoots.About
                                            )
                                        }
                                        dropdown={<SiteAbout />}
                                        withCaret={true}
                                    >
                                        About
                                    </SiteNavigationToggle>
                                </li>
                            </ul>
                        </nav>
                        {activeRoot === NavigationRoots.Topics && (
                            <SiteNavigationTopics
                                onClose={closeOverlay}
                                topics={categorizedTopics}
                                className="hide-sm-only"
                            />
                        )}
                        <div className="site-search-cta">
                            <div className="search-input-wrapper hide-md-down">
                                <SiteSearchInput />
                            </div>
                            <button
                                onClick={onToggleMobileSearch}
                                data-track-note="mobile-search-button"
                                className="mobile-search hide-md-up"
                            >
                                <FontAwesomeIcon icon={faSearch} />
                            </button>

                            <SiteNavigationToggle
                                isActive={
                                    activeRoot === NavigationRoots.Subscribe
                                }
                                toggle={() =>
                                    toggleActiveRoot(NavigationRoots.Subscribe)
                                }
                                dropdown={
                                    <NewsletterSubscriptionForm
                                        context={
                                            NewsletterSubscriptionContext.Floating
                                        }
                                    />
                                }
                                className="newsletter-subscription"
                            >
                                <span className="hide-lg-down">Subscribe</span>
                                <FontAwesomeIcon
                                    className="hide-lg-up"
                                    icon={faEnvelopeOpenText}
                                />
                            </SiteNavigationToggle>
                            <a
                                href="/donate"
                                className="donate"
                                data-track-note="header-navigation"
                            >
                                Donate
                            </a>
                        </div>
                    </div>
                </div>
            </div>
            {showMobileSearch && (
                <div className="hide-md-up" style={{ width: "100%" }}>
                    <SiteSearchInput />
                </div>
            )}
        </>
    )
}

export const runSiteNavigation = (baseUrl: string) => {
    ReactDOM.render(
        <SiteNavigation baseUrl={baseUrl} />,
        document.querySelector(".site-navigation-root")
    )
}
